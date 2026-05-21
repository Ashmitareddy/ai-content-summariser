import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import crypto from 'crypto';
import * as cheerio from 'cheerio';

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
    const $ = cheerio.load(html);

    // Remove scripts and styles
    $('script, style, noscript').remove();

    // Extract text from body
    return $('body').text().replace(/\s+/g, ' ').trim();
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

    // Call Groq API
    console.log('Calling Groq API for text summary...');
    const prompt = `You are an expert tutor. Create a study guide based on the following text.
Your output must be EXACTLY a valid JSON object matching this schema:
{
  "summary": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
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

Ensure the JSON is perfectly formatted. The 'summary' must be an array of 3 to 5 highly concise, high-impact bullet points capturing the core essence of the input text. No markdown wrapping, just the raw JSON object.

Text:
${rawText.substring(0, 5000)}`;

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
