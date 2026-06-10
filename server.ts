import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const app = express();
app.use(express.json());
const PORT = 3000;

app.post('/api/generate-cards', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create highly effective flashcards from the following study material.
Focus on key concepts, vocabulary, and important facts.
Make the questions clear and the answers concise.

Study Material:
${text}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: "The question or prompt" },
                  back: { type: Type.STRING, description: "The answer or definition" }
                },
                required: ["front", "back"]
              }
            }
          },
          required: ["cards"]
        }
      }
    });

    const data = JSON.parse(response.text || '{"cards":[]}');
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate cards' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
