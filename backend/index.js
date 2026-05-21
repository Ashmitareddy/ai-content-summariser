import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import crypto from 'crypto';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json());

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Connect to MongoDB
let isConnected = false;
const connectDB = async () => {
  if (isConnected || !process.env.MONGODB_URI) return;
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = db.connections[0].readyState;
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Mongoose Schema
const cacheSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  text: String,
  url: String,
  summary: Array,
  flashcards: Array,
  quiz: Array,
  createdAt: { type: Date, default: Date.now }
});
const CacheModel = mongoose.models.Cache || mongoose.model('Cache', cacheSchema);

// Helper to hash text
const generateHash = (text) => crypto.createHash('sha256').update(text).digest('hex');

// Helper to extract text from URL
const extractTextFromUrl = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    if (!article || !article.textContent) {
      throw new Error('Failed to parse article content.');
    }
    return article.textContent.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw new Error('Could not extract text from the provided URL.');
  }
};

// Summarize Endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    await connectDB();
    const { input } = req.body; // input can be text or url
    if (!input) return res.status(400).json({ error: 'Input is required' });

    let rawText = input;
    let isUrl = false;

    // Check if input is a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      isUrl = true;
      rawText = await extractTextFromUrl(input);
    }

    if (rawText.length < 50) {
      return res.status(400).json({ error: 'Input text is too short to summarize.' });
    }

    const textHash = generateHash(rawText);

    // Check MongoDB Cache
    if (isConnected) {
      const cachedResult = await CacheModel.findOne({ hash: textHash });
      if (cachedResult) {
        console.log('Cache hit for hash:', textHash);
        return res.json({ summary: cachedResult.summary, flashcards: cachedResult.flashcards, quiz: cachedResult.quiz });
      }
    }

    console.log('Calling Groq API for text summary...');
    let textToProcess = rawText;
    
    // Chunking Logic for > 4000 words
    const words = rawText.split(/\s+/);
    if (words.length > 4000) {
      console.log(`Text is ${words.length} words. Chunking...`);
      const chunks = [];
      for (let i = 0; i < words.length; i += 2000) {
        chunks.push(words.slice(i, i + 2000).join(' '));
      }
      
      const chunkPromises = chunks.map(chunk => 
        groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are an expert at extracting key takeaways. Return ONLY a JSON object with a "takeaways" array containing 3 string bullet points.' },
            { role: 'user', content: `Extract 3 key takeaways from this text:\n\n${chunk}` }
          ],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' }
        }).then(res => JSON.parse(res.choices[0]?.message?.content || '{"takeaways":[]}').takeaways)
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      const allTakeaways = chunkResults.flat().join('\n- ');
      
      textToProcess = `Here are detailed aggregated takeaways from the full text:\n- ${allTakeaways}\n\nUse these to generate the final comprehensive summary, flashcards, and quiz.`;
    } else {
      textToProcess = rawText.substring(0, 5000 * 5); // Allow up to ~25000 chars if not chunking
    }

    const prompt = `You are an expert tutor. Create a study guide based on the following text or aggregated takeaways.
Your output must be EXACTLY a valid JSON object matching this schema:
{
  "summary": ["Bullet point 1", "Bullet point 2", "Bullet point 3", "Bullet point 4", "Bullet point 5"],
  "flashcards": [
    { "id": 1, "front": "Question 1?", "back": "Answer 1." },
    // exactly 5 flashcards
  ],
  "quiz": [
    // exactly 3 questions: 1 Easy, 1 Medium, 1 Hard
    { "id": 1, "difficulty": "easy", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A", "explanation": "..." },
    { "id": 2, "difficulty": "medium", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "B", "explanation": "..." },
    { "id": 3, "difficulty": "hard", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "C", "explanation": "..." }
  ]
}

Ensure the JSON is perfectly formatted. The 'summary' must be an array of EXACTLY 5 highly concise, high-impact bullet points capturing the core essence of the input. No markdown wrapping, just the raw JSON object.

Text:
${textToProcess}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a strict JSON outputting machine.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content;
    const generatedData = JSON.parse(responseContent);

    // Save to Cache if connected
    if (isConnected && generatedData.summary && generatedData.flashcards && generatedData.quiz) {
      const newCache = new CacheModel({
        hash: textHash,
        text: isUrl ? null : rawText,
        url: isUrl ? input : null,
        summary: generatedData.summary,
        flashcards: generatedData.flashcards,
        quiz: generatedData.quiz,
      });
      await newCache.save();
    }

    res.json(generatedData);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate content.' });
  }
});

// History Endpoint
app.get('/api/history', async (req, res) => {
  try {
    await connectDB();
    if (!isConnected) return res.json([]);
    const history = await CacheModel.find().sort({ createdAt: -1 }).limit(20);
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
