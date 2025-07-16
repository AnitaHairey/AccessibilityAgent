import { AzureOpenAI } from "openai";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Azure OpenAI
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-06-01",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
});

async function testAPI() {
  try {
    console.log("Testing Azure OpenAI API connection...");
    console.log("Configuration:");
    console.log("- Endpoint:", process.env.AZURE_OPENAI_ENDPOINT);
    console.log("- API Version:", process.env.AZURE_OPENAI_API_VERSION || "2024-06-01");
    console.log("- Deployment:", process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
    console.log("- API Key:", process.env.AZURE_OPENAI_API_KEY ? "***PROVIDED***" : "NOT PROVIDED");
    
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello! Please respond with a simple 'Hello, world!' message."
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    console.log("✅ API test successful!");
    console.log("Response:", response.choices[0]?.message?.content);
    
  } catch (error: any) {
    console.error("❌ API test failed:", error);
    
    if (error.status === 404) {
      console.log("\n🔍 Troubleshooting 404 error:");
      console.log("1. Check if deployment name 'gpt-4o' exists in your Azure OpenAI resource");
      console.log("2. Verify the API version is correct");
      console.log("3. Ensure the endpoint URL is correct");
    }
  }
}

testAPI();
