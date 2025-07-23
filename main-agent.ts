import { nvda } from "@guidepup/guidepup";
import { exec } from "child_process";
import { promisify } from "util";
import { AzureOpenAI } from "openai";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { PlanningAgent, TaskPlan, ElementInfo } from "./planning-agent";
import { ExecutionAgent, ExecutionResult } from "./execution-agent";

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Initialize Azure OpenAI
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-06-01",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
});

interface OverallTaskResult {
  success: boolean;
  planningTime: number;
  executionTime: number;
  totalSteps: number;
  gatheredData: any[];
  plan: TaskPlan;
  executionResult: ExecutionResult;
}

/**
 * 智能无障碍代理主类
 * 协调规划和执行两个模块
 */
class IntelligentAccessibilityAgent {
  private planningAgent: PlanningAgent;
  private executionAgent: ExecutionAgent;

  constructor() {
    this.planningAgent = new PlanningAgent(openai);
    this.executionAgent = new ExecutionAgent(openai);
  }

  /**
   * 执行完整的任务流程：规划 -> 执行
   */
  async executeTask(task: string, startingUrl?: string): Promise<OverallTaskResult> {
    console.log("🤖 智能无障碍代理 v2.0");
    console.log("=" .repeat(60));
    console.log(`📋 任务: ${task}`);
    console.log("=" .repeat(60));

    // 验证配置
    if (!this.validateConfiguration()) {
      throw new Error("Azure OpenAI配置不完整！请检查.env文件");
    }

    const startTime = Date.now();
    let planningTime = 0;
    let executionTime = 0;

    try {
      // 启动NVDA
      await nvda.start();
      console.log("✅ NVDA启动成功!");

      // 打开目标网页
      await this.openWebPage(startingUrl || "https://www.google.com");

      // 第一阶段：规划
      console.log("\n🧠 第一阶段：任务规划");
      console.log("-" .repeat(40));
      
      const planningStartTime = Date.now();
      
      // 获取accessibility tree
      console.log("🔍 分析页面结构...");
      const elements = await this.planningAgent.getPageStructure();
      console.log(`📊 发现 ${elements.length} 个页面元素`);

      // 制定执行计划
      console.log("📋 制定执行计划...");
      const plan = await this.planningAgent.createTaskPlan(task, elements);
      
      planningTime = Date.now() - planningStartTime;
      console.log(`⏱️ 规划耗时: ${planningTime}ms`);

      this.printPlan(plan);

      // 第二阶段：执行
      console.log("\n⚡ 第二阶段：计划执行");
      console.log("-" .repeat(40));
      
      const executionStartTime = Date.now();
      const executionResult = await this.executionAgent.executePlan(plan);
      executionTime = Date.now() - executionStartTime;

      console.log(`⏱️ 执行耗时: ${executionTime}ms`);

      // 组装结果
      const overallResult: OverallTaskResult = {
        success: executionResult.success,
        planningTime,
        executionTime,
        totalSteps: executionResult.steps,
        gatheredData: executionResult.finalData,
        plan,
        executionResult
      };

      this.printFinalReport(overallResult);
      return overallResult;

    } catch (error) {
      console.error("❌ 任务执行过程中出错:", error);
      throw error;
    } finally {
      try {
        await nvda.stop();
        console.log("\n✅ NVDA停止成功");
      } catch (stopError) {
        console.error("❌ NVDA停止时出错:", stopError);
      }
    }
  }

  /**
   * 验证Azure OpenAI配置
   */
  private validateConfiguration(): boolean {
    const required = [
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_ENDPOINT', 
      'AZURE_OPENAI_DEPLOYMENT_NAME'
    ];

    for (const key of required) {
      if (!process.env[key]) {
        console.error(`❌ 缺少环境变量: ${key}`);
        return false;
      }
    }
    return true;
  }

  /**
   * 打开网页
   */
  private async openWebPage(url: string): Promise<void> {
    console.log(`🌐 打开网页: ${url}`);
    
    try {
      await execAsync(`start chrome "${url}"`);
      console.log("🌍 浏览器已打开，等待页面加载...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (browserError) {
      console.log("⚠️ 无法自动打开浏览器，请手动打开页面");
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise<void>((resolve) => {
        rl.question("页面准备好后按回车继续: ", () => {
          rl.close();
          resolve();
        });
      });
    }
  }

  /**
   * 打印执行计划
   */
  private printPlan(plan: TaskPlan): void {
    console.log("\n📋 执行计划详情:");
    console.log(`🎯 目标: ${plan.objective}`);
    console.log(`🔍 目标元素: ${plan.targetElements.join(', ')}`);
    console.log(`🚫 忽略模式: ${plan.ignorePatterns.join(', ')}`);
    console.log(`✅ 成功标准: ${plan.successCriteria.join(', ')}`);
    console.log(`📊 最大步数: ${plan.maxSteps}`);
    console.log(`🛠️ 策略: ${plan.strategy}`);
  }

  /**
   * 打印最终报告
   */
  private printFinalReport(result: OverallTaskResult): void {
    console.log("\n" + "=" .repeat(80));
    console.log("📊 任务执行报告");
    console.log("=" .repeat(80));
    
    console.log(`🎯 任务状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`⏱️ 规划时间: ${result.planningTime}ms`);
    console.log(`⚡ 执行时间: ${result.executionTime}ms`);
    console.log(`📊 总步数: ${result.totalSteps}步`);
    console.log(`📈 效率: ${result.totalSteps <= result.plan.maxSteps * 0.6 ? '高效' : '一般'}`);
    
    console.log(`\n🎯 原始目标: ${result.plan.objective}`);
    console.log(`✅ 完成原因: ${result.executionResult.completionReason}`);

    if (result.gatheredData && result.gatheredData.length > 0) {
      console.log("\n📋 收集到的数据:");
      result.gatheredData.forEach((data, idx) => {
        console.log(`${idx + 1}. [${data.type}] ${data.value}`);
      });
    } else {
      console.log("\n📋 未收集到相关数据");
    }

    console.log("\n🔍 执行历史:");
    const history = this.executionAgent.getExecutionHistory();
    history.slice(-10).forEach((action, idx) => {
      console.log(`${history.length - 10 + idx + 1}. ${action}`);
    });

    console.log("\n💡 性能分析:");
    console.log(`⚡ 规划效率: ${result.planningTime < 5000 ? '优秀' : '需要优化'}`);
    console.log(`🎯 执行精度: ${result.success ? '100%' : '0%'}`);
    console.log(`📊 数据质量: ${result.gatheredData.length > 0 ? '有效' : '无效'}`);
    
    console.log("=" .repeat(80));
  }
}

/**
 * 交互式任务选择
 */
async function runInteractiveTasks() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("🤖 智能无障碍代理 v2.0");
  console.log("=" .repeat(50));
  console.log("预设任务:");
  console.log("1. 搜索北京天气信息");
  console.log("2. 查找科技新闻");
  console.log("3. 搜索笔记本电脑价格");
  console.log("4. 查找餐厅评价");
  console.log("5. 自定义任务");
  console.log("=" .repeat(50));

  const choice = await new Promise<string>((resolve) => {
    rl.question("选择任务 (1-5): ", resolve);
  });

  let task = "";
  let url = "https://www.google.com";

  switch (choice) {
    case "1":
      task = "搜索北京的当前天气信息，包括温度、天气状况和预报";
      break;
    case "2":
      task = "搜索最新的科技新闻，找到新闻标题和摘要";
      break;
    case "3":
      task = "搜索笔记本电脑价格，找到具体型号和价格信息";
      break;
    case "4":
      task = "搜索北京的餐厅评价，找到评分和评论";
      break;
    case "5":
      task = await new Promise<string>((resolve) => {
        rl.question("输入自定义任务: ", resolve);
      });
      url = await new Promise<string>((resolve) => {
        rl.question("输入起始网址 (回车使用Google): ", (input) => {
          resolve(input || "https://www.google.com");
        });
      });
      break;
    default:
      task = "搜索北京的当前天气信息";
  }

  rl.close();

  const agent = new IntelligentAccessibilityAgent();
  await agent.executeTask(task, url);
}

/**
 * 默认天气任务
 */
async function runDefaultTask() {
  const agent = new IntelligentAccessibilityAgent();
  
  await agent.executeTask(
    "搜索北京的当前天气信息，获取温度、天气状况和预报",
    "https://www.accuweather.com/en/cn/beijing/101924/weather-forecast/101924"
  );
}

// 根据命令行参数运行
if (process.argv.includes('--interactive')) {
  runInteractiveTasks().catch(console.error);
} else {
  runDefaultTask().catch(console.error);
}

export { IntelligentAccessibilityAgent, PlanningAgent, ExecutionAgent };
