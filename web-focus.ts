import { nvda } from "@guidepup/guidepup";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

(async () => {
  try {
    console.log("Starting accessibility agent for web navigation...");
    
    // Start NVDA first
    await nvda.start();
    console.log("NVDA started successfully!");
    
    // Open a web browser automatically to Google
    console.log("Opening Google to search for today's weather...");
    try {
      // Try to open Chrome with Google
      await execAsync('start chrome "https://www.google.com"');
      console.log("Google opened. Waiting for page to load...");
      
      // Wait for the page to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // The browser window should automatically have focus after opening
      // No need for Alt+Tab since we just opened it
      console.log("Browser should now have focus...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (browserError) {
      console.log("Could not auto-open browser. Please manually:");
      console.log("1. Open your web browser");
      console.log("2. Navigate to any webpage");
      console.log("3. Make sure the webpage has focus");
      console.log("4. Press Enter in this terminal to continue");
      
      // Wait for user confirmation
      await new Promise(resolve => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (data) => {
          if (data[0] === 13) { // Enter key
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve(void 0);
          }
        });
      });
    }
    
    console.log("\nStarting Google weather search task...");
    
    // Wait a bit more for Google to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Task 1: Find and focus on the Google search box
    console.log("1. Looking for Google search box...");
    
    let searchBox = await nvda.lastSpokenPhrase();
    console.log("Found search element:", searchBox);

    
    // Task 2: Enter weather search query
    console.log("2. Typing weather search query...");
    const weatherQuery = "today weather in beijing"; // Example query
    await nvda.type(weatherQuery);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Entered search query: "${weatherQuery}"`);
    
    // Task 3: Submit the search
    console.log("3. Submitting search...");
    
    // Method 1: Try typing Enter directly
    try {
      console.log("Attempting to press Enter key...");
      await nvda.perform(nvda.keyboardCommands.activate);
      console.log("Enter key pressed successfully");
    } catch (enterError) {
      console.log("Method 1 failed, trying alternative methods...");
      
      // Method 2: Try using the activate command
      try {
        await nvda.perform(nvda.keyboardCommands.activate);
        console.log("Used activate command");
      } catch (activateError) {
        console.log("Method 2 failed, trying method 3...");
        
        // Method 3: Try finding and clicking the search button
        console.log("Looking for search button...");
        await nvda.type("b"); // Navigate to button
        await new Promise(resolve => setTimeout(resolve, 500));
        const button = await nvda.lastSpokenPhrase();
        console.log("Found button:", button);
        
        if (button.toLowerCase().includes("search") || button.toLowerCase().includes("google")) {
          await nvda.perform(nvda.keyboardCommands.activate);
          console.log("Clicked search button");
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for search results
    
    // Task 4: Navigate through search results to find weather information
    console.log("4. Looking for weather information in search results...");
    
    // Read the current page content
    let currentContent = await nvda.lastSpokenPhrase();
    console.log("Current page content:", currentContent);
    
    // Navigate through the first few elements to find weather info
    for (let i = 0; i < 100; i++) {
      await nvda.next();
      const element = await nvda.lastSpokenPhrase();
      console.log(`Search result ${i + 1}:`, element);
      
      // Check if this element contains weather information
      if (element.toLowerCase().includes("天气") || 
          element.toLowerCase().includes("温度") || 
          element.toLowerCase().includes("降水")) {
        console.log("🌤️  Found weather information!");
        break;
      }
    }
    
    console.log("\nWeb navigation complete!");
    
  } catch (error) {
    console.error("Error during web navigation:", error);
  } finally {
    // Always stop NVDA
    try {
      await nvda.stop();
      console.log("NVDA stopped successfully.");
    } catch (stopError) {
      console.error("Error stopping NVDA:", stopError);
    }
  }
})();
