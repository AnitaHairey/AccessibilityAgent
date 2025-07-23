import { nvda } from "@guidepup/guidepup";
import { AzureOpenAI } from "openai";
import { TaskPlan, ElementInfo } from "./planning-agent";

export interface ActionPlan {
  action: "next" | "previous" | "activate" | "type" | "wait" | "complete" | "failed";
  parameter?: string;
  reasoning: string;
  confidence?: number;
  extractedInfo?: string;
}

export interface ExecutionResult {
  success: boolean;
  steps: number;
  finalData: any;
  completionReason: string;
}

export class ExecutionAgent {
  private openai: AzureOpenAI;
  private stepCount: number = 0;
  private actionHistory: string[] = [];
  private gatheredData: any[] = [];
  private visitedElements: Set<string> = new Set();

  constructor(openai: AzureOpenAI) {
    this.openai = openai;
  }

  /**
   * 根据计划执行任务
   */
  async executePlan(plan: TaskPlan): Promise<ExecutionResult> {
    console.log("\n🎯 执行任务计划");
    console.log(`📋 目标: ${plan.objective}`);
    console.log(`🎯 目标元素: ${plan.targetElements.join(', ')}`);
    console.log(`🚫 忽略模式: ${plan.ignorePatterns.join(', ')}`);
    console.log(`✅ 成功标准: ${plan.successCriteria.join(', ')}`);
    console.log(`📊 最大步数: ${plan.maxSteps}`);

    this.stepCount = 0;
    this.actionHistory = [];
    this.gatheredData = [];
    this.visitedElements.clear();

    while (this.stepCount < plan.maxSteps) {
      console.log(`\n📍 步骤 ${this.stepCount + 1}/${plan.maxSteps}`);
      
      // 获取当前内容
      const currentContent = await nvda.lastSpokenPhrase();
      console.log(`🔊 当前内容: "${this.truncateContent(currentContent)}"`);

      // 决定下一步行动（包含所有判断逻辑）
      const action = await this.decideAction(currentContent, plan);
      
      // 执行行动
      const shouldContinue = await this.executeAction(action);
      if (!shouldContinue) {
        break;
      }

      this.stepCount++;
    }

    // 任务未完成
    return {
      success: false,
      steps: this.stepCount,
      finalData: this.gatheredData,
      completionReason: this.stepCount >= plan.maxSteps ? "达到最大步数" : "任务失败"
    };
  }

  /**
   * 根据当前情况和计划决定下一步行动
   */
  private async decideAction(currentContent: string, plan: TaskPlan): Promise<ActionPlan> {
    try {
      const isRepeated = this.visitedElements.has(currentContent);
      this.visitedElements.add(currentContent);

      const prompt = `
You are executing a web accessibility task. You need to make ALL decisions including:
1. Whether to ignore irrelevant content
2. Whether current content contains useful information  
3. Whether the task is complete
4. What action to take next

TASK PLAN:
- OBJECTIVE: ${plan.objective}
- TARGET ELEMENTS: ${plan.targetElements.join(', ')}
- IGNORE PATTERNS: ${plan.ignorePatterns.join(', ')}
- SUCCESS CRITERIA: ${plan.successCriteria.join(', ')}

CURRENT SITUATION:
- CURRENT CONTENT: "${currentContent}"
- ELEMENT REPEATED: ${isRepeated}
- INFORMATION COLLECTED SO FAR: ${JSON.stringify(this.gatheredData)}
- STEP: ${this.stepCount + 1}/${plan.maxSteps}

RECENT ACTIONS:
${this.actionHistory.slice(-5).join('\n')}

DECISION FRAMEWORK:
1. RELEVANCE: Does current content match ignore patterns? Should it be skipped?
2. VALUE: Does current content contain information relevant to target elements?
3. COMPLETION: Do you have enough information to satisfy the success criteria?
4. ACTION: What should be done next?

Available actions:
- "next": Move to next element
- "previous": Move to previous element  
- "activate": Click/activate current element
- "type": Type text (provide parameter)
- "wait": Wait for page load
- "complete": Task completed successfully (use when success criteria are met)
- "failed": Cannot complete task

Respond with JSON:
{
  "action": "action_name",
  "parameter": "text if typing",
  "reasoning": "explain your decision including relevance/value/completion assessment",
  "confidence": number (0-100),
  "extractedInfo": "any useful information from current content or null"
}

IMPORTANT: 
- Use "complete" when you have sufficient information to meet the success criteria
- Don't waste steps on irrelevant content (ads, navigation, etc.)
- Look for semantic meaning, not exact text matches
- Be decisive about task completion when criteria are substantially met
`;

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a focused execution agent. Follow the plan precisely and avoid unnecessary actions."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 300
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        const cleanedResult = this.cleanJsonResponse(result);
        const actionPlan = JSON.parse(cleanedResult);
        
        // 如果大模型提取了有用信息，保存它
        if (actionPlan.extractedInfo && actionPlan.extractedInfo !== "null") {
          this.gatheredData.push({
            content: actionPlan.extractedInfo,
            source: currentContent,
            step: this.stepCount + 1,
            confidence: actionPlan.confidence || 0
          });
          console.log(`✅ 提取信息: ${actionPlan.extractedInfo}`);
        }
        
        // 显示置信度
        if (actionPlan.confidence) {
          console.log(`📊 置信度: ${actionPlan.confidence}%`);
        }
        
        return actionPlan;
      }
    } catch (error) {
      console.error("决策AI出错:", error);
    }

    // 默认行动
    return {
      action: "next",
      reasoning: "AI决策失败，继续下一个元素",
      confidence: 0,
      extractedInfo: undefined
    };
  }

  /**
   * 执行具体行动
   */
  private async executeAction(action: ActionPlan): Promise<boolean> {
    console.log(`🎯 执行: ${action.action.toUpperCase()}`);
    console.log(`💭 原因: ${action.reasoning}`);

    try {
      switch (action.action) {
        case "next":
          await this.moveNext();
          break;

        case "previous":
          await nvda.previous();
          this.actionHistory.push(`步骤 ${this.stepCount + 1}: 移动到上一个元素`);
          break;

        case "activate":
          await nvda.perform(nvda.keyboardCommands.activate);
          this.actionHistory.push(`步骤 ${this.stepCount + 1}: 激活当前元素`);
          console.log("⏳ 等待页面响应...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;

        case "type":
          if (action.parameter) {
            await nvda.type(action.parameter);
            this.actionHistory.push(`步骤 ${this.stepCount + 1}: 输入 "${action.parameter}"`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          break;

        case "wait":
          console.log("⏳ 等待页面加载...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.actionHistory.push(`步骤 ${this.stepCount + 1}: 等待页面加载`);
          break;

        case "complete":
          console.log("\n🎉 任务成功完成!");
          return false;

        case "failed":
          console.log("\n❌ 任务执行失败");
          return false;

        default:
          console.log(`⚠️ 未知行动: ${action.action}`);
          break;
      }

      // 操作后的短暂延迟
      await new Promise(resolve => setTimeout(resolve, 200));
      return true;

    } catch (error) {
      console.error(`❌ 执行行动失败 ${action.action}:`, error);
      this.actionHistory.push(`步骤 ${this.stepCount + 1}: 错误 - ${error}`);
      return true; // 继续执行
    }
  }

  /**
   * 移动到下一个元素
   */
  private async moveNext(): Promise<void> {
    await nvda.next();
    this.actionHistory.push(`步骤 ${this.stepCount + 1}: 移动到下一个元素`);
  }

  /**
   * 截断内容用于显示
   */
  private truncateContent(content: string, maxLength: number = 80): string {
    return content.length > maxLength ? content.substring(0, maxLength) + "..." : content;
  }

  /**
   * 清理JSON响应
   */
  private cleanJsonResponse(response: string): string {
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    cleaned = cleaned.trim();
    
    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      lines.shift();
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      cleaned = lines.join('\n').trim();
    }
    
    return cleaned;
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): string[] {
    return [...this.actionHistory];
  }

  /**
   * 获取收集到的数据
   */
  getGatheredData(): any[] {
    return [...this.gatheredData];
  }
}
