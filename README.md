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
npm run agent
```

**Features:**
- 🤖 GPT-4 powered content analysis
- 🎯 Intelligent weather data extraction
- 📊 Structured weather information (temperature, conditions, humidity, etc.)
- 🧠 Context-aware analysis
- 📈 Confidence scoring


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

- `accessibility-agent.ts` - Main agent logic
- `web-focus.ts` - Demo

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
