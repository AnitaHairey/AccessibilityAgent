import { nvda } from "@guidepup/guidepup";
import { AzureOpenAI } from "openai";

export interface ElementInfo {
  content: string;
  type: string;
  role: string;
  level?: number;
}

export interface TaskPlan {
  objective: string;
  targetElements: string[];
  ignorePatterns: string[];
  successCriteria: string[];
  maxSteps: number;
  strategy: string;
}

export class PlanningAgent {
  private openai: AzureOpenAI;

  constructor(openai: AzureOpenAI) {
    this.openai = openai;
  }

  /**
   * 获取页面的结构信息 - 改进版本，捕获更多元素类型
   */
  async getPageStructure(): Promise<ElementInfo[]> {
    const elements: ElementInfo[] = [];

    try {
      console.log("🔍 获取页面结构信息...");
      
      // 获取标题结构
      await this.captureHeadings(elements);
      
      // 可以扩展获取其他类型的元素
      // await this.captureButtons(elements);
      // await this.captureLinks(elements);
      
      console.log(`📊 页面结构分析完成，发现 ${elements.length} 个重要元素`);
      
    } catch (error) {
      console.error("Error analyzing page structure:", error);
    }

    return elements;
  }

  /**
   * 根据任务和页面元素创建任务计划
   */
  async createTaskPlan(task: string, elements: ElementInfo[]): Promise<TaskPlan> {
    try {
      const elementsText = elements
        .map((el, idx) => `${idx + 1}. [${el.type}] ${el.content}`)
        .join('\n');

      const prompt = `
You are a web accessibility planning agent. Based on the task and page elements, create a focused execution plan.

TASK: ${task}

PAGE ELEMENTS FOUND:
${elementsText}

Create a JSON plan with:
{
  "objective": "Clear task objective",
  "targetElements": ["flexible keywords or patterns to match relevant content, not exact strings"],
  "ignorePatterns": ["element types/content to ignore like ads, headers, navigation"],
  "successCriteria": ["semantic conditions based on content meaning, not exact element matches"],
  "maxSteps": "reasonable step limit (10-30)",
  "strategy": "step-by-step approach description"
}

IMPORTANT GUIDELINES:
1. TARGET ELEMENTS should be flexible semantic patterns (e.g., "temperature numbers", "weather conditions", "product prices") not exact element text
2. SUCCESS CRITERIA should focus on CONTENT MEANING rather than finding specific elements:
   - Instead of "find element X", use "temperature information is identified"
   - Instead of "click heading Y", use "relevant forecast data is located"
   - Use semantic concepts that can be matched against any content containing that information
3. Make criteria achievable through content analysis, not navigation requirements
4. Prioritize finding information over navigating to specific elements
5. Success should be measurable by information content, not interaction completion

For weather searches: focus on temperature values, condition descriptions, forecast text
For news searches: focus on headline content, article summaries, publication info  
For shopping: focus on product names, price values, rating information
For general searches: focus on relevant content that answers the user's question

The agent should succeed when it finds the requested information, regardless of which specific elements contained it.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert web accessibility planner. Create focused, efficient plans for web navigation tasks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 600
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        const cleanedResult = this.cleanJsonResponse(result);
        return JSON.parse(cleanedResult);
      }
    } catch (error) {
      console.error("Error creating task plan:", error);
    }

    // 返回默认计划 - 使用语义化的成功标准
    return {
      objective: task,
      targetElements: ["relevant content", "informational text", "data values"],
      ignorePatterns: ["navigation", "advertisement", "header", "footer", "menu"],
      successCriteria: ["task-relevant information is identified", "key data points are found", "user question can be answered"],
      maxSteps: 20,
      strategy: "Navigate through page elements to find and analyze task-relevant content using semantic matching"
    };
  }

  private extractElementLevel(content: string): number | undefined {
    const match = content.match(/heading\s+level\s+(\d+)/i);
    return match ? parseInt(match[1]) : undefined;
  }

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
   * 获取页面所有标题
   */
  private async captureHeadings(elements: ElementInfo[]): Promise<void> {
    try {
      let headingCount = 0;
      const maxHeadings = 20;

      while (headingCount < maxHeadings) {
        // 使用NVDA的标题导航命令
        await nvda.perform(nvda.keyboardCommands.moveToNextHeading);
        await new Promise(resolve => setTimeout(resolve, 200));

        const content = await nvda.lastSpokenPhrase();
        
        if (content && content.trim() && content.toLowerCase().includes('heading')) {
          const level = this.extractElementLevel(content);
          elements.push({
            content: content.trim(),
            type: 'heading',
            role: 'content',
            level: level
          });
          
          console.log(`📍 H${level || '?'}: ${content.trim().substring(0, 50)}...`);
          headingCount++;
        } else {
          // 没有更多标题或到达页面末尾
          break;
        }
      }
      
      console.log(`✅ 共发现 ${headingCount} 个标题`);
    } catch (error) {
      console.log("标题获取完成或遇到错误");
    }
  }
}
