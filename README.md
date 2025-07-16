# Intelligent Task Agent

An AI-powered accessibility agent that can complete web tasks using NVDA screen reader, mimicking human navigation behavior.

## Overview

This intelligent task agent can:
- 🤖 Receive a task description (e.g., "search for weather information")
- 🔍 Navigate web pages using NVDA screen reader step by step
- 🧠 Make intelligent decisions based on screen reader content
- 🎯 Complete tasks or determine if they're impossible within 50 steps
- 📊 Provide detailed reports of the process and results

## Features

### 🎯 Task-Oriented Navigation
- **Intelligent Decision Making**: Uses GPT-4 to analyze screen reader content and decide next actions
- **Human-like Behavior**: Mimics how humans would navigate using screen reader
- **Adaptive Strategy**: Adjusts approach based on current context and progress
- **Loop Prevention**: Detects and avoids infinite navigation loops

### 🛠️ Available Actions
- `next` - Move to next element (nvda.next())
- `previous` - Move to previous element (nvda.previous())
- `activate` - Click/activate current element (buttons, links)
- `type` - Type text in input fields
- `wait` - Wait for page loading
- `complete` - Mark task as successfully completed
- `failed` - Mark task as failed/impossible

### 📊 Progress Tracking
- **Step Counter**: Tracks current step out of maximum allowed
- **Confidence Scoring**: AI provides confidence level for each decision
- **Task Progress**: Estimates completion percentage
- **Context Memory**: Remembers recent elements and actions

## Available Scripts

### Basic Examples
```bash
npm start              # Basic NVDA operation example
npm run web           # Manual web navigation demo
npm run agent         # Complete web navigation agent
```

### Weather Search Agents
```bash
npm run search        # Simple weather search
npm run weather       # Smart weather search with keyword matching
npm run pattern       # Advanced pattern-based weather analysis (no API key)
npm run ai            # AI-powered weather analysis (requires OpenAI API key)
```

## AI-Powered Weather Analysis

### Option 1: OpenAI Integration (Recommended)

1. **Get OpenAI API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Create `.env` file**:
```bash
cp .env.example .env
# Edit .env and add your API key:
OPENAI_API_KEY=your_actual_api_key_here
```
3. **Run AI Agent**:
```bash
npm run ai
```

**Features:**
- 🤖 GPT-4 powered content analysis
- 🎯 Intelligent weather data extraction
- 📊 Structured weather information (temperature, conditions, humidity, etc.)
- 🧠 Context-aware analysis
- 📈 Confidence scoring

### Option 2: Smart Pattern Matching (No API Required)

```bash
npm run pattern
```

**Features:**
- 🔍 Advanced regex pattern matching
- 📊 Confidence scoring (0-100%)
- 🎯 Weather-specific keyword detection
- ⚡ Fast, local analysis
- 📈 Multi-element result ranking

## How It Works

### Traditional Approach (Basic)
```typescript
// Simple string matching
if (element.includes("weather") || element.includes("temperature")) {
    console.log("Found weather info!");
}
```

### AI-Powered Approach
```typescript
// Intelligent analysis with context understanding
const weatherInfo = await analyzeWeatherContent(element);
if (weatherInfo.hasWeather) {
    console.log(`Temperature: ${weatherInfo.temperature}`);
    console.log(`Condition: ${weatherInfo.condition}`);
    console.log(`Location: ${weatherInfo.location}`);
}
```

### Smart Pattern Approach
```typescript
// Advanced pattern matching with confidence scoring
const weatherInfo = analyzeWeatherContentLocal(element);
if (weatherInfo.confidence >= 40) {
    console.log(`Weather detected with ${weatherInfo.confidence}% confidence`);
    console.log(weatherInfo.extractedData);
}
```

## Sample Output

### AI Analysis Result:
```
🌤️  AI DETECTED WEATHER INFORMATION!
==================================================
📍 Location: Beijing
🌡️  Temperature: 25°C
☁️  Condition: Partly cloudy
💧 Humidity: 60%
💨 Wind Speed: 15 km/h
📅 Forecast: Sunny tomorrow
📝 Summary: Current weather conditions for Beijing with detailed forecast
==================================================
```

### Smart Pattern Result:
```
🌤️  WEATHER DETECTED! (Confidence: 85%)
==================================================
📊 Extracted Data:
🌡️  Temperature: 25°C
☁️  Condition: partly cloudy
📍 Location: beijing
💧 Humidity: 60%
💨 Wind: 15 km/h
📝 Analysis: Weather information detected with 85% confidence...
==================================================
```

## NVDA Web Navigation Shortcuts

When using NVDA on webpages, here are common navigation shortcuts:

- `h` - Next heading
- `Shift+h` - Previous heading
- `k` - Next link
- `Shift+k` - Previous link
- `b` - Next button
- `Shift+b` - Previous button
- `f` - Next form field
- `Shift+f` - Previous form field
- `g` - Next graphic
- `Shift+g` - Previous graphic
- `t` - Next table
- `Shift+t` - Previous table

## Project Structure

- `example.ts` - Basic NVDA operation example
- `web-agent.ts` - Complete web navigation agent
- `smart-weather-agent.ts` - Intelligent weather search agent
- `web-navigation.ts` - Manual web navigation demo
- `web-focus.ts` - Web focus-specific script

## Notes

1. Ensure NVDA is properly installed and can start normally
2. Don't manually operate keyboard while script is running to avoid interfering with NVDA operations
3. If auto-opening browser fails, manually open browser and navigate to webpage
4. Script will automatically stop NVDA when completed

## Troubleshooting

### Common Issues

**Q: Getting "ES module" error**
A: Ensure package.json contains `"type": "module"`

**Q: NVDA fails to start**
A: Check if NVDA is properly installed, try manually starting NVDA for testing

**Q: Browser fails to auto-open**
A: Manually open browser, navigate to webpage, then press Enter to continue script

**Q: NVDA reads terminal content instead of webpage**
A: Ensure browser window has focus, click anywhere on browser window

## Tech Stack

- TypeScript
- Node.js
- @guidepup/guidepup - NVDA automation library
- tsx - TypeScript runner
