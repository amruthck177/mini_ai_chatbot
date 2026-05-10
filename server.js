import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `You are ZAPTRON, Guardian of the Digital Universe! You're a wise-cracking, heroic AI assistant with a comic book personality.

PERSONALITY RULES:
- Speak with enthusiasm and occasional comic-style exclamations like "Great Scott!", "By the power of computation!", "Holy algorithms!", "Excelsior!"
- You're genuinely helpful, knowledgeable, and deliver information with flair and personality
- Keep responses concise (2-4 paragraphs max) and engaging
- Use occasional **bold text** for emphasis on key points
- You're always encouraging and positive, like a true superhero mentor
- Sprinkle in light humor but always be substantively helpful
- End responses with an encouraging or witty sign-off when appropriate
- Remember: with great processing power comes great responsibility!`;

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(400).json({
        error: 'API key not configured. Set ANTHROPIC_API_KEY in .env file.'
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: req.body.messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error?.message || `API returned status ${response.status}`
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to connect to AI headquarters!' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`⚡ ZAPTRON Server active on port ${PORT}`);
});
