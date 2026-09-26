import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

import {
  saveMemory,
  getUserMemories,
  searchMemories,
  deleteMemory,
} from "./services/memory.js";

import {
  extractMemory,
} from "./services/memoryExtractor.js";

import {
  user,
  memories,
  tasks
} from "./data/seed.js";

dotenv.config();

console.log(
  "Gemini API key loaded:",
  process.env.GEMINI_API_KEY ? "YES" : "NO"
);

const app = express();

app.use(cors());
app.use(express.json());

// ------------------------------------
// Gemini AI
// ------------------------------------

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ------------------------------------
// Health Check
// ------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Saathi AI Brain",
    message: "Saathi backend is running",
  });
});

// ------------------------------------
// TEST MEMORY
// ------------------------------------

app.post("/api/memory/test", (req, res) => {

  const memory = saveMemory({
    userId: "ramesh-001",

    type: "LIFE",

    title: "First railway job",

    content:
      "Ramesh worked at a railway office when he was younger.",

    tags: [
      "railway",
      "work",
      "youth"
    ],

    importance: 0.9,
  });

  res.json({
    success: true,
    memory,
  });
});

// ------------------------------------
// GET USER MEMORIES
// ------------------------------------

app.get("/api/memory/:userId", (req, res) => {

  const memories =
    getUserMemories(req.params.userId);

  res.json({
    success: true,
    memories,
  });
});

// ------------------------------------
// SEARCH MEMORIES
// ------------------------------------

app.get("/api/memory/:userId/search", (req, res) => {

  const query = req.query.q || "";

  const memories =
    searchMemories(
      req.params.userId,
      query
    );

  res.json({
    success: true,
    query,
    memories,
  });
});

// ------------------------------------
// AI MEMORY EXTRACTION TEST
// ------------------------------------

app.post("/api/memory/extract", async (req, res) => {

  try {

    const {
      message,
      userProfile = {},
    } = req.body;

    if (!message || !message.trim()) {

      return res.status(400).json({
        success: false,
        error: "Message is required",
      });

    }

    const extracted =
      await extractMemory(
        message,
        userProfile
      );

    res.json({
      success: true,
      extracted,
    });

  } catch (error) {

    console.error(
      "Memory endpoint error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ------------------------------------
// Chat with Saathi
// ------------------------------------

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const systemPrompt = `
You are Saathi.

Saathi is a warm, respectful AI companion designed
to support elderly people in their everyday lives.

You are NOT a medical professional.
You must never diagnose diseases or pretend to provide
medical treatment.

Your personality:

- Warm
- Patient
- Respectful
- Calm
- Friendly
- Reassuring
- Never childish
- Never patronizing

Use simple language.
Keep responses reasonably short.
Talk naturally, like a caring companion.

IMPORTANT:

You have access to information about the person you
are talking with.

Use their preferences and memories naturally.

Do not randomly list memories.
Only mention a memory when it is relevant to the
conversation.

For example:

If the person talks about gardening, you may mention
that they enjoy growing roses.

If the person talks about their daughter, you may
mention Meena.

If the person talks about their younger years,
you may mention their railway career.

------------------------------------------
CURRENT USER
------------------------------------------

Name:
${user.name}

Preferred name:
${user.preferredName}

Age:
${user.age}

Language:
${user.language}

Location:
${user.location}

Preferences:
${user.preferences.join(", ")}

------------------------------------------
FAMILY
------------------------------------------

${JSON.stringify(user.family, null, 2)}

------------------------------------------
MEMORIES
------------------------------------------

${JSON.stringify(memories, null, 2)}

------------------------------------------
TODAY'S TASKS
------------------------------------------

${JSON.stringify(tasks, null, 2)}

------------------------------------------

Remember:

You are Saathi.

Your goal is not simply to answer questions.

Your goal is to make the person feel heard,
remembered, supported and connected.

Never claim to physically see, touch, move,
or perform actions that you cannot actually perform.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    res.json({
      success: true,
      response: response.text,
    });

} catch (error) {
  console.error("========== GEMINI ERROR ==========");
  console.error("Message:", error?.message);
  console.error("Name:", error?.name);
  console.error("Status:", error?.status);
  console.error("Full error:", error);
  console.error("==================================");

  res.status(500).json({
    success: false,
    error: error?.message || "Unknown Gemini error",
  });
}
});

// ------------------------------------
// Start Server
// ------------------------------------

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Saathi AI Brain running on http://localhost:${PORT}`);
});