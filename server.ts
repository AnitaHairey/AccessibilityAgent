import express, { Request, Response } from 'express';
import { voiceOver } from "@guidepup/guidepup";
import { exec } from "child_process";
import { promisify } from "util";

const app = express();
const port = 3000;
const execAsync = promisify(exec);

app.use(express.json());

let isVoiceOverRunning = false;

// Start VoiceOver
app.post('/voiceover/start', async (req: Request, res: Response) => {
  try {
    if (!isVoiceOverRunning) {
      await voiceOver.start();
      isVoiceOverRunning = true;
    }
    res.json({ success: true, message: 'VoiceOver started' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop VoiceOver  
app.post('/voiceover/stop', async (req: Request, res: Response) => {
  try {
    if (isVoiceOverRunning) {
      await voiceOver.stop();
      isVoiceOverRunning = false;
    }
    res.json({ success: true, message: 'VoiceOver stopped' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Type text
app.post('/voiceover/type', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    await voiceOver.type(text);
    res.json({ success: true, message: `Typed: ${text}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Navigate next
app.post('/voiceover/next', async (req: Request, res: Response) => {
  try {
    await voiceOver.next();
    const currentItem = await voiceOver.lastSpokenPhrase();
    res.json({ success: true, currentItem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current item
app.get('/voiceover/current', async (req: Request, res: Response) => {
  try {
    const currentItem = await voiceOver.lastSpokenPhrase();
    res.json({ success: true, currentItem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Click current item
app.post('/voiceover/click', async (req: Request, res: Response) => {
  try {
    await voiceOver.act();
    res.json({ success: true, message: 'Clicked current item' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Press key using VoiceOver
app.post('/voiceover/press', async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }
    await voiceOver.press(key);
    res.json({ success: true, message: `Pressed key: ${key}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Open application
app.post('/system/open-app', async (req: Request, res: Response) => {
  try {
    const { appName } = req.body;
    if (!appName) {
      return res.status(400).json({ success: false, error: 'App name is required' });
    }
    await execAsync(`open -a "${appName}"`);
    res.json({ success: true, message: `Opened ${appName}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Press key
app.post('/system/press-key', async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }
    await execAsync(`osascript -e "tell application \\"System Events\\" to keystroke \\"${key}\\""`);
    res.json({ success: true, message: `Pressed key: ${key}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'running', 
    voiceOverRunning: isVoiceOverRunning,
    timestamp: new Date().toISOString() 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  if (isVoiceOverRunning) {
    try {
      await voiceOver.stop();
    } catch (e) {
      console.log('Error stopping VoiceOver:', e);
    }
  }
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 VoiceOver Server running on http://localhost:${port}`);
  console.log('\n📋 Available endpoints:');
  console.log('  POST /voiceover/start    - Start VoiceOver');
  console.log('  POST /voiceover/stop     - Stop VoiceOver');
  console.log('  POST /voiceover/type     - Type text');
  console.log('  POST /voiceover/next     - Navigate next');
  console.log('  GET  /voiceover/current  - Get current item');
  console.log('  POST /voiceover/click    - Click current item');
  console.log('  POST /voiceover/press    - Press key with VoiceOver');
  console.log('  POST /system/open-app    - Open application');
  console.log('  POST /system/press-key   - Press key with system');
  console.log('  GET  /health             - Health check');
});
