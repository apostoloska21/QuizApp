import express from "express";
import cors from "cors";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 5000;

const GEMINI_API_KEY = "AIzaSyAoMSUfnm4QA89da-OeyyCHuCRGJW6g-iE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req: any, res: any) => {
  res.send("Kviz backend e aktiven!");
});

// Helper: prompt for quiz generation
function buildQuizPrompt(topic: string) {
  return `
Generiraj JSON objekt za kviz na tema: "${topic}". Kvizot treba da sodrzi tocno 5 prasanja. Za sekoe prasanje:
- "question": tekst na prasanje
- "image": link do relevantna slika (moze AI generirana ili stock, no da e povrzana so prasanjeto)
- "options": niza od 4 odgovori (stringovi)
- "answer": index na tocen odgovor (0-3)
Primer format:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "...",
      "image": "https://...",
      "options": ["...", "...", "...", "..."],
      "answer": 0
    },
    ... (vkupno 5 prasanja)
  ]
}
VRAKAJ S A M O validen JSON bez objasnuvanja!"`;
}

// Endpoint za generiranje kviz
app.post("/api/generate-quiz", async (req: any, res: any) => {
  const { topic, numQuestions } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Nedostasuva tema" });
  }
  const n = Math.max(1, Math.min(Number(numQuestions) || 5, 20));
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
Generiraj JSON objekt za kviz na tema: "${topic}". Kvizot treba da sodrzi tocno ${n} prasanja. Za sekoe prasanje:
- "question": tekst na prasanje
- "image": VALIDEN https:// URL do realna slika povrzana so prasanjeto (na primer Wikipedia, Unsplash, Wikimedia, Pixabay, ili slicno). NIKOGAS ne ostavaj prazno i ne stavaj tekst, samo validen URL!
- "options": niza od 4 odgovori (stringovi)
- "answer": index na tocen odgovor (0-3)
Primer format:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "...",
      "image": "https://...",
      "options": ["...", "...", "...", "..."],
      "answer": 0
    },
    ... (vkupno ${n} prasanja)
  ]
}
VRAKAJ S A M O validen JSON bez objasnuvanja!`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Try to parse JSON from Gemini response
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);
    const quiz = JSON.parse(jsonString);
    res.json(quiz);
  } catch (err: any) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Neuspesno generiranje kviz. Probajte povtorno." });
  }
});

app.listen(PORT, () => {
  console.log(`Serverot e startuvan na http://localhost:${PORT}`);
});
