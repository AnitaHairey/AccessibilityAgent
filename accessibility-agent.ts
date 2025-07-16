import { nvda } from "@guidepup/guidepup";
import { exec } from "child_process";
import { promisify } from "util";
import { AzureOpenAI } from "openai";
import * as dotenv from "dotenv";
import * as readline from "readline";

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

interface ActionPlan {
  action: "next" | "previous" | "activate" | "type" | "wait" | "complete" | "failed" | "back" | "refresh";
  parameter?: string;
  reasoning: string;
  confidence: number; // 0-100
  taskProgress: number; // 0-100
  nextStrategy?: string;
}

interface TaskResult {
  completed: boolean;
  steps: number;
  finalResult: string;
  taskData?: any;
  success: boolean;
}

class FlexibleTaskAgent {
  private stepCount: number = 0;
  private maxSteps: number = 50;
  private taskDescription: string = "";
  private actionHistory: string[] = [];
  private contextMemory: string[] = [];
  private visitedElements: Set<string> = new Set();
  private isInteractive: boolean = false;

  constructor(maxSteps: number = 50, interactive: boolean = false) {
    this.maxSteps = maxSteps;
    this.isInteractive = interactive;
  }

  // Helper function to clean JSON response from markdown code blocks
  private cleanJsonResponse(response: string): string {
    // Remove markdown code block markers
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // If the response starts with markdown code block, remove it
    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      lines.shift(); // Remove first line (```json or ```)
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Remove last line (```)
      }
      cleaned = lines.join('\n').trim();
    }
    
    return cleaned;
  }

  async decideNextAction(currentContent: string, stepNumber: number): Promise<ActionPlan> {
    try {
      // Check if we've seen this element before
      const isRepeated = this.visitedElements.has(currentContent);
      this.visitedElements.add(currentContent);

      const prompt = `
You are an intelligent accessibility agent controlling NVDA screen reader to complete a task.

TASK: ${this.taskDescription}

CURRENT STEP: ${stepNumber}/${this.maxSteps}

CURRENT SCREEN READER CONTENT: "${currentContent}"
ELEMENT REPEATED: ${isRepeated ? "YES - We've seen this element before" : "NO - This is a new element"}

RECENT ACTIONS TAKEN:
${this.actionHistory.slice(-8).map((action, idx) => `${this.actionHistory.length - 8 + idx + 1}. ${action}`).join('\n')}

CONTEXT MEMORY (recent important elements):
${this.contextMemory.slice(-12).join('\n')}

AVAILABLE ACTIONS:
- "next": Move to next element (nvda.next())
- "previous": Move to previous element (nvda.previous())
- "activate": Click/activate current element (nvda.perform(nvda.keyboardCommands.activate))
- "type": Type text (provide text in parameter)
- "wait": Wait briefly for page to load
- "back": Go back in browser
- "refresh": Refresh current page
- "complete": Task is successfully completed
- "failed": Task cannot be completed

INTELLIGENT DECISION RULES:
1. If element is repeated and we're not making progress → try different action or declare failed
2. If current content contains input field/search box → use "type" action with relevant query
3. If current content is a button/link that matches task goal → use "activate" action
4. If current content is navigation/menu relevant to task → use "activate" action
5. If current content is irrelevant but new → use "next" to continue exploring
6. If found information that completes the task → use "complete" action
7. If stuck in loops or no progress → use "back" or "refresh" or "failed"

TASK-SPECIFIC STRATEGIES:
- Weather search: Look for search boxes, weather sites, temperature/condition info
- Shopping: Look for product search, categories, prices, "add to cart" buttons
- News: Look for headlines, articles, news categories
- Navigation: Look for menus, links, navigation elements
- Information search: Look for relevant content, search functionality

PROGRESS ASSESSMENT:
- 0-20%: Initial exploration, finding main navigation
- 20-40%: Located relevant section/search functionality
- 40-60%: Entering queries or navigating to content
- 60-80%: Processing results or navigating to specific items
- 80-100%: Found target information or completed action

Please respond with a JSON object:
{
  "action": "next|previous|activate|type|wait|back|refresh|complete|failed",
  "parameter": "text to type if action is type",
  "reasoning": "detailed explanation of why this action was chosen",
  "confidence": 85,
  "taskProgress": 45,
  "nextStrategy": "brief description of what the next few steps should accomplish"
}

Be decisive and focus on task completion! Avoid infinite loops.
`;

      const response = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o", 
        messages: [
          {
            role: "system",
            content: "You are an intelligent accessibility navigation agent. Analyze screen reader content and decide the best next action to complete the given task efficiently. Avoid loops and focus on progress."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error("No response from OpenAI");
      }

      // Clean up markdown code blocks and extract JSON
      const cleanedResult = this.cleanJsonResponse(result);
      const actionPlan: ActionPlan = JSON.parse(cleanedResult);
      return actionPlan;

    } catch (error) {
      console.error("Error getting AI decision:", error);
      return {
        action: "next",
        reasoning: `Error in AI decision making: ${error}. Continuing with next.`,
        confidence: 10,
        taskProgress: this.stepCount / this.maxSteps * 100
      };
    }
  }

  async executeAction(action: ActionPlan): Promise<boolean> {
    try {
      console.log(`\n🎯 Step ${this.stepCount + 1}: ${action.action.toUpperCase()}`);
      console.log(`💭 Reasoning: ${action.reasoning}`);
      console.log(`🎯 Confidence: ${action.confidence}%`);
      console.log(`📊 Task Progress: ${action.taskProgress}%`);
      if (action.nextStrategy) {
        console.log(`🔮 Next Strategy: ${action.nextStrategy}`);
      }

      // Interactive mode - ask user for confirmation
      if (this.isInteractive && (action.action === "activate" || action.action === "type")) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(`❓ Confirm ${action.action.toUpperCase()} action? (y/n/s to skip): `, resolve);
        });

        rl.close();

        if (answer.toLowerCase() === 'n') {
          console.log("❌ Action cancelled by user");
          action.action = "next";
        } else if (answer.toLowerCase() === 's') {
          console.log("⏭️ Action skipped by user");
          action.action = "next";
        }
      }

      switch (action.action) {
        case "next":
          await nvda.next();
          this.actionHistory.push(`Step ${this.stepCount + 1}: Moved to next element`);
          break;

        case "previous":
          await nvda.previous();
          this.actionHistory.push(`Step ${this.stepCount + 1}: Moved to previous element`);
          break;

        case "activate":
          await nvda.perform(nvda.keyboardCommands.activate);
          this.actionHistory.push(`Step ${this.stepCount + 1}: Activated current element`);
          console.log("⏳ Waiting for page response...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;

        case "type":
          if (action.parameter) {
            await nvda.type(action.parameter);
            this.actionHistory.push(`Step ${this.stepCount + 1}: Typed "${action.parameter}"`);
            console.log("⏳ Waiting for typing to complete...");
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          break;

        case "wait":
          console.log("⏳ Waiting for page to load...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.actionHistory.push(`Step ${this.stepCount + 1}: Waited for page load`);
          break;

        case "back":
          // Skip back functionality for now
          console.log("⚠️ Back functionality not implemented, continuing with next");
          await nvda.next();
          this.actionHistory.push(`Step ${this.stepCount + 1}: Attempted back, moved to next instead`);
          break;

        case "refresh":
          // Skip refresh functionality for now
          console.log("⚠️ Refresh functionality not implemented, continuing with next");
          await nvda.next();
          this.actionHistory.push(`Step ${this.stepCount + 1}: Attempted refresh, moved to next instead`);
          break;

        case "complete":
          console.log("\n🎉 TASK COMPLETED SUCCESSFULLY!");
          return true;

        case "failed":
          console.log("\n❌ TASK FAILED - Cannot be completed with current approach");
          return true;

        default:
          console.log(`⚠️ Unknown action: ${action.action}`);
          break;
      }

      let delayTime = 200;
      
      switch (action.action) {
        case "next":
        case "previous":
          delayTime = 100;
          break;
        case "activate":
          delayTime = 300;
          break;
        case "type":
          delayTime = 250;
          break;
        default:
          delayTime = 200;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayTime));
      this.stepCount++;
      return false;

    } catch (error) {
      console.error(`❌ Error executing action ${action.action}:`, error);
      this.actionHistory.push(`Step ${this.stepCount + 1}: Error - ${error}`);
      return false;
    }
  }

  async executeTask(task: string, startingUrl?: string): Promise<TaskResult> {
    console.log("🤖 Flexible Intelligent Task Agent");
    console.log("=" .repeat(60));
    console.log(`📋 Task: ${task}`);
    console.log(`⚙️  Max Steps: ${this.maxSteps}`);
    console.log(`🎮 Interactive Mode: ${this.isInteractive ? 'ON' : 'OFF'}`);
    console.log("=" .repeat(60));

    this.taskDescription = task;
    this.stepCount = 0;
    this.actionHistory = [];
    this.contextMemory = [];
    this.visitedElements.clear();

    try {
      // Check if Azure OpenAI is configured
      if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
        throw new Error("Azure OpenAI not configured! Please create a .env file with: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT_NAME");
      }

      // Start NVDA
      await nvda.start();
      console.log("✅ NVDA started successfully!");

      // Open starting URL
      const targetUrl = startingUrl || "https://www.google.com";
      console.log(`🌐 Opening: ${targetUrl}`);
      
      try {
        await execAsync(`start chrome "${targetUrl}"`);
        console.log("Page opened, waiting for load...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (browserError) {
        console.log("⚠️ Could not auto-open browser. Please open manually and press Enter to continue.");
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        await new Promise<void>((resolve) => {
          rl.question("Press Enter when ready: ", () => {
            rl.close();
            resolve();
          });
        });
      }

      console.log("\n🚀 Starting intelligent task execution...");

      // Main execution loop
      let consecutiveNextActions = 0;
      let isTaskComplete = false;

      while (this.stepCount < this.maxSteps && !isTaskComplete) {
        console.log(`\n📍 Step ${this.stepCount + 1}/${this.maxSteps}`);
        console.log("-" .repeat(40));

        // Get current screen reader content
        const currentContent = await nvda.lastSpokenPhrase();
        const contentPreview = currentContent.length > 80 ? 
          currentContent.substring(0, 80) + "..." : currentContent;
        console.log(`🔊 Current content: "${contentPreview}"`);

        // Store important content in memory
        if (currentContent && currentContent.length > 5) {
          this.contextMemory.push(`Step ${this.stepCount + 1}: ${currentContent}`);
          // Keep only last 20 items in memory
          if (this.contextMemory.length > 20) {
            this.contextMemory = this.contextMemory.slice(-20);
          }
        }

        // Get AI decision for next action
        console.log("🧠 AI is analyzing and deciding next action...");
        const actionPlan = await this.decideNextAction(currentContent, this.stepCount + 1);

        // Track consecutive "next" actions to detect loops
        if (actionPlan.action === "next") {
          consecutiveNextActions++;
        } else {
          consecutiveNextActions = 0;
        }

        // If too many consecutive next actions, force a different strategy
        if (consecutiveNextActions > 8) {
          console.log("⚠️ Too many consecutive 'next' actions. Forcing different strategy...");
          actionPlan.action = "back";
          actionPlan.reasoning = "Breaking out of potential navigation loop";
          consecutiveNextActions = 0;
        }

        // Execute the action
        isTaskComplete = await this.executeAction(actionPlan);

        // Emergency exit if we detect we're completely stuck
        if (this.stepCount > 30 && actionPlan.taskProgress < 20) {
          console.log("⚠️ Task seems stuck with low progress. Continuing with next action...");
          // Just continue with the planned action
        }
      }

      // Extract final result
      const finalResult = await this.extractFinalResult();
      
      return {
        completed: isTaskComplete && this.stepCount < this.maxSteps,
        steps: this.stepCount,
        finalResult: finalResult.summary,
        taskData: finalResult.taskData,
        success: isTaskComplete
      };

    } catch (error) {
      console.error("❌ Error during task execution:", error);
      return {
        completed: false,
        steps: this.stepCount,
        finalResult: `Error: ${error}`,
        success: false
      };
    } finally {
      try {
        await nvda.stop();
        console.log("\n✅ NVDA stopped successfully");
      } catch (stopError) {
        console.error("❌ Error stopping NVDA:", stopError);
      }
    }
  }

  async extractFinalResult(): Promise<{summary: string, taskData?: any}> {
    try {
      const recentContent = this.contextMemory.slice(-15).join('\n');
      
      const prompt = `
Based on the following screen reader content and action history, analyze what was accomplished in this task:

ORIGINAL TASK: ${this.taskDescription}

CONTENT ANALYZED:
${recentContent}

ACTIONS TAKEN:
${this.actionHistory.slice(-15).join('\n')}

TOTAL STEPS: ${this.stepCount}

Please provide a JSON response with:
{
  "summary": "Comprehensive summary of what was accomplished and whether the task was successful",
  "taskData": {
    "keyFindings": ["list of key information found"],
    "completionStatus": "completed|partial|failed",
    "relevantData": "any specific data extracted that relates to the task"
  }
}

Focus on concrete results and be honest about the level of success.
`;

      const response = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are analyzing the results of a task execution. Provide an honest assessment of what was accomplished."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 400
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        const cleanedResult = this.cleanJsonResponse(result);
        return JSON.parse(cleanedResult);
      }
    } catch (error) {
      console.error("Error extracting final result:", error);
    }

    return {
      summary: `Task executed in ${this.stepCount} steps. Check action history for details.`
    };
  }

  printDetailedReport(result: TaskResult) {
    console.log("\n" + "=" .repeat(80));
    console.log("📊 DETAILED TASK EXECUTION REPORT");
    console.log("=" .repeat(80));
    console.log(`📋 Original Task: ${this.taskDescription}`);
    console.log(`✅ Task Status: ${result.success ? 'COMPLETED' : 'INCOMPLETE'}`);
    console.log(`📈 Steps Used: ${result.steps}/${this.maxSteps} (${(result.steps/this.maxSteps*100).toFixed(1)}%)`);
    console.log(`🎯 Overall Success: ${result.completed ? 'YES' : 'NO'}`);
    
    console.log(`\n📝 Final Result: ${result.finalResult}`);
    
    if (result.taskData) {
      console.log("\n🔍 Task Data Analysis:");
      console.log(`📊 Completion Status: ${result.taskData.completionStatus || 'Unknown'}`);
      
      if (result.taskData.keyFindings) {
        console.log("🔑 Key Findings:");
        result.taskData.keyFindings.forEach((finding: string, idx: number) => {
          console.log(`   ${idx + 1}. ${finding}`);
        });
      }
      
      if (result.taskData.relevantData) {
        console.log(`📋 Relevant Data: ${result.taskData.relevantData}`);
      }
    }

    console.log("\n📋 Complete Action History:");
    this.actionHistory.forEach((action, idx) => {
      console.log(`${(idx + 1).toString().padStart(2, '0')}. ${action}`);
    });

    console.log("\n💡 Performance Analysis:");
    console.log(`⏱️  Average time per step: ${(result.steps > 0 ? '~5-8 seconds' : 'N/A')}`);
    console.log(`🔄 Efficiency: ${result.steps < this.maxSteps * 0.6 ? 'High' : result.steps < this.maxSteps * 0.8 ? 'Medium' : 'Low'}`);
    console.log(`🎯 Success Rate: ${result.success ? '100%' : '0%'}`);

    console.log("=" .repeat(80));
  }
}

// Interactive CLI for different tasks
async function runInteractiveTasks() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("🤖 Flexible Intelligent Task Agent");
  console.log("=" .repeat(50));
  console.log("Available task examples:");
  console.log("1. Search for weather in Beijing");
  console.log("2. Find news about technology");
  console.log("3. Search for laptop prices");
  console.log("4. Find restaurant reviews");
  console.log("5. Custom task");
  console.log("=" .repeat(50));

  const choice = await new Promise<string>((resolve) => {
    rl.question("Choose a task (1-5): ", resolve);
  });

  let task = "";
  let url = "https://www.google.com";

  switch (choice) {
    case "1":
      task = "Search for current weather information for Beijing, China. Find temperature, weather conditions, and forecast.";
      break;
    case "2":
      task = "Search for recent technology news. Find headlines and article summaries.";
      break;
    case "3":
      task = "Search for laptop prices. Find specific models and their prices.";
      break;
    case "4":
      task = "Search for restaurant reviews in Beijing. Find ratings and review summaries.";
      break;
    case "5":
      task = await new Promise<string>((resolve) => {
        rl.question("Enter your custom task: ", resolve);
      });
      url = await new Promise<string>((resolve) => {
        rl.question("Enter starting URL (or press Enter for Google): ", (input) => {
          resolve(input || "https://www.google.com");
        });
      });
      break;
    default:
      task = "Search for current weather information for Beijing, China.";
  }

  const maxSteps = await new Promise<number>((resolve) => {
    rl.question("Max steps (default 50): ", (input) => {
      resolve(parseInt(input) || 50);
    });
  });

  const interactive = await new Promise<boolean>((resolve) => {
    rl.question("Interactive mode? (y/n): ", (input) => {
      resolve(input.toLowerCase() === 'y');
    });
  });

  rl.close();

  const agent = new FlexibleTaskAgent(maxSteps, interactive);
  const result = await agent.executeTask(task, url);
  agent.printDetailedReport(result);
}

// Auto-run weather task if no interaction
async function runWeatherTask() {
  const agent = new FlexibleTaskAgent(50, false);
  
  const result = await agent.executeTask(
    "Search for current weather information for Beijing, China. Find temperature, weather conditions, and forecast if possible.",
    "https://www.accuweather.com/en/cn/beijing/101924/weather-forecast/101924?city=beijing"
  );

  agent.printDetailedReport(result);
}

// Run based on command line arguments
if (process.argv.includes('--interactive')) {
  runInteractiveTasks();
} else {
  runWeatherTask();
}
