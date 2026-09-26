import "dotenv/config";
import express from "express";
import cors from "cors";
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
  getConversation,
  addConversationMessage,
  getRecentConversation,
  clearConversation,
} from "./services/conversation.js";

import {
  user,
  memories,
  tasks
} from "./data/seed.js";

console.log(
  "Gemini API key loaded:",
  process.env.GEMINI_API_KEY ? "YES" : "NO"
);

const app = express();

app.use(cors());
app.use(express.json());

// ------------------------------------
// Gemini AI & Model Cascade
// ------------------------------------

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const AI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];

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
// USER PROFILE
// ------------------------------------

app.get("/api/user/:userId", (req, res) => {
  if (req.params.userId !== user.id) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  res.json({
    success: true,
    user,
  });
});

// ------------------------------------
// SAATHI USER CONTEXT
// ------------------------------------

app.get("/api/context/:userId", (req, res) => {
  const userId = req.params.userId;

  if (userId !== user.id) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const userMemories = getUserMemories(userId);
  const userTasks = tasks.filter(
    task => task.userId === userId
  );

  res.json({
    success: true,
    context: {
      profile: {
        id: user.id,
        name: user.name,
        preferredName: user.preferredName,
        age: user.age,
        language: user.language,
        location: user.location,
        preferences: user.preferences,
        family: user.family,
      },
      memories: userMemories,
      today: {
        tasks: userTasks,
        completedTasks: userTasks.filter(t => t.completed).length,
        pendingTasks: userTasks.filter(t => !t.completed).length,
      },
    },
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
    content: "Ramesh worked at a railway office when he was younger.",
    tags: ["railway", "work", "youth"],
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
  const memories = getUserMemories(req.params.userId);

  res.json({
    success: true,
    memories,
  });
});

// ------------------------------------
// SAVE USER MEMORY
// ------------------------------------

app.post("/api/memory/:userId", (req, res) => {
  const { type = "PREFERENCE", title = "New Memory", content, tags = [], importance = 0.8 } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      error: "Memory content is required",
    });
  }

  const memory = saveMemory({
    userId: req.params.userId,
    type,
    title,
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [tags],
    importance,
  });

  res.json({
    success: true,
    memory,
  });
});

// ------------------------------------
// SEARCH MEMORIES
// ------------------------------------

app.get("/api/memory/:userId/search", (req, res) => {
  const query = req.query.q || "";
  const memories = searchMemories(req.params.userId, query);

  res.json({
    success: true,
    query,
    memories,
  });
});

// ------------------------------------
// MEMORY GRAPH (Step 5K)
// ------------------------------------

app.get("/api/memory/:userId/graph", (req, res) => {
  const userMemories = getUserMemories(req.params.userId);

  // Collect all tags as nodes
  const tagSet = new Set();
  const edgePairs = new Set();

  userMemories.forEach(memory => {
    const memTags = memory.tags || [];
    memTags.forEach(tag => tagSet.add(tag.toLowerCase()));

    // Connect tags within the same memory
    for (let i = 0; i < memTags.length; i++) {
      for (let j = i + 1; j < memTags.length; j++) {
        const a = memTags[i].toLowerCase();
        const b = memTags[j].toLowerCase();
        const key = [a, b].sort().join("||");
        edgePairs.add(key);
      }
    }
  });

  // Add user name as central node
  const userName = user.preferredName || "User";
  tagSet.add(userName.toLowerCase());

  // Connect user to all tags
  tagSet.forEach(tag => {
    if (tag !== userName.toLowerCase()) {
      const key = [userName.toLowerCase(), tag].sort().join("||");
      edgePairs.add(key);
    }
  });

  const nodes = Array.from(tagSet).map((tag, i) => ({
    id: `node-${i}`,
    label: tag.charAt(0).toUpperCase() + tag.slice(1),
    isCenter: tag === userName.toLowerCase(),
  }));

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.label.toLowerCase()] = n.id; });

  const edges = Array.from(edgePairs).map((pair, i) => {
    const [a, b] = pair.split("||");
    return {
      id: `edge-${i}`,
      source: nodeMap[a],
      target: nodeMap[b],
    };
  }).filter(e => e.source && e.target);

  res.json({
    success: true,
    nodes,
    edges,
  });
});

// ------------------------------------
// AI MEMORY EXTRACTION TEST
// ------------------------------------

app.post("/api/memory/extract", async (req, res) => {
  try {
    const { message, userProfile = {} } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const extracted = await extractMemory(message, userProfile);

    res.json({
      success: true,
      extracted,
    });
  } catch (error) {
    console.error("Memory endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ------------------------------------
// CHAT WITH SAATHI + MEMORY (Step 5B)
// ------------------------------------

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      userId = "ramesh-001",
      language = "en",
    } = req.body;

    // Load user profile
    const userProfile = userId === user.id ? user : {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    // ------------------------------------
    // 1. Find relevant existing memories
    // ------------------------------------

    const relevantMemories = searchMemories(userId, message);

    const memoriesForAI = relevantMemories
      .slice(0, 5)
      .map(memory => ({
        type: memory.type,
        title: memory.title,
        content: memory.content,
        tags: memory.tags,
      }));

    // ------------------------------------
    // 2. Intelligent Intent Disambiguation: Question / Recall vs New Memory
    // ------------------------------------

    const lowerMessage = message.toLowerCase().trim();

    const isQuestionOrRecall =
      lowerMessage.includes("?") ||
      lowerMessage.includes("what i like") ||
      lowerMessage.includes("what do i like") ||
      lowerMessage.includes("remember what i like") ||
      lowerMessage.includes("remember that what i like") ||
      lowerMessage.includes("remember what") ||
      lowerMessage.includes("remember who") ||
      lowerMessage.includes("remember when") ||
      lowerMessage.includes("remember where") ||
      lowerMessage.includes("remember if") ||
      lowerMessage.includes("remember my") ||
      lowerMessage.includes("do you remember") ||
      lowerMessage.includes("did you remember") ||
      lowerMessage.includes("can you remember") ||
      lowerMessage.startsWith("what ") ||
      lowerMessage.startsWith("who ") ||
      lowerMessage.startsWith("when ") ||
      lowerMessage.startsWith("where ") ||
      lowerMessage.startsWith("why ") ||
      lowerMessage.startsWith("how ") ||
      lowerMessage.startsWith("tell me ") ||
      lowerMessage.startsWith("do you ") ||
      lowerMessage.startsWith("did you ");

    // 2A. Instant Retrieval: If user asks about their likes/hobbies — read from actual DB
    if (
      lowerMessage.includes("what i like") ||
      lowerMessage.includes("what do i like") ||
      lowerMessage.includes("tell me what i like") ||
      lowerMessage.includes("my hobbies") ||
      lowerMessage.includes("my preferences") ||
      (lowerMessage.includes("remember") && lowerMessage.includes("like")) ||
      (lowerMessage.includes("remember") && lowerMessage.includes("hobby"))
    ) {
      const userMemories = getUserMemories(userId);
      const prefMemories = userMemories.filter(m =>
        m.type === "PREFERENCE" || m.type === "HOBBY" ||
        (m.tags && (m.tags.includes("preference") || m.tags.includes("hobby") ||
          m.tags.includes("gardening") || m.tags.includes("fishing") ||
          m.tags.includes("tea") || m.tags.includes("snacks")))
      );
      let responseText;
      if (prefMemories.length === 0) {
        responseText = language === "hi" 
          ? "मुझे आपकी कोई पसंद अभी याद नहीं है। आप मुझे बताएं, मैं हमेशा याद रखूँगा!"
          : "I do not have any saved preferences yet. Tell me what you enjoy and I will remember it!";
      } else {
        const uniqueItems = [...new Set(prefMemories.map(m => m.content))].slice(0, 3);
        responseText = language === "hi"
          ? `हाँ, मुझे याद है! ${uniqueItems.join(". और ")}.`
          : `Yes, I remember! ${uniqueItems.join(". Also, ")}.`;
      }

      addConversationMessage(userId, "user", message.trim());
      addConversationMessage(userId, "assistant", responseText);

      return res.json({
        success: true,
        response: responseText,
        modelUsed: "instant-intent-retrieval",
        openSection: "memories",
        memorySaved: false,
        memory: null,
      });
    }

    // 2B. Instant Retrieval: If user asks "what are my memories" or "what do you remember"
    if (
      lowerMessage.includes("what are my memories") ||
      lowerMessage.includes("what do you remember") ||
      lowerMessage.includes("show my memories") ||
      lowerMessage.includes("show memories") ||
      lowerMessage.includes("meri yaadein") ||
      lowerMessage.includes("kya yaad hai")
    ) {
      const userMemories = getUserMemories(userId);
      let responseText;
      if (userMemories.length === 0) {
        responseText = language === "hi"
          ? "आपकी मेमोरी वॉल्ट में अभी कुछ नहीं है। अपनी बातें साझा करें और मैं याद रखूँगा!"
          : "Your memory vault is empty right now. Share your stories and I will remember them!";
      } else {
        const titles = userMemories.slice(0, 3).map(m => m.title || m.content.substring(0, 30));
        responseText = language === "hi"
          ? `आपके पास ${userMemories.length} यादें सुरक्षित हैं, जैसे: ${titles.join(", ")}.`
          : `You have ${userMemories.length} saved memories, including: ${titles.join(", ")}.`;
      }

      addConversationMessage(userId, "user", message.trim());
      addConversationMessage(userId, "assistant", responseText);

      return res.json({
        success: true,
        response: responseText,
        modelUsed: "instant-intent-retrieval",
        openSection: "memories",
        memorySaved: false,
        memory: null,
      });
    }

    // 2C. Instant Retrieval: If user asks about tasks / reminders
    if (
      lowerMessage.includes("what are my reminders") ||
      lowerMessage.includes("what are my tasks") ||
      lowerMessage.includes("what do i have to do") ||
      lowerMessage.includes("when is my medicine") ||
      lowerMessage.includes("show my tasks") ||
      lowerMessage.includes("meri dawai") ||
      lowerMessage.includes("mera kaam")
    ) {
      const userTasks = tasks.filter(t => t.userId === userId && !t.completed);
      let responseText = language === "hi" ? "अभी कोई बाकी काम या रिमाइंडर नहीं है।" : "You have no pending tasks right now.";
      if (userTasks.length > 0) {
        responseText = language === "hi"
          ? `आपके ${userTasks.length} काम बाकी हैं: ${userTasks[0].title}, समय ${userTasks[0].time} पर।`
          : `You have ${userTasks.length} pending task${userTasks.length > 1 ? 's' : ''}: ${userTasks[0].title} at ${userTasks[0].time}.`;
      }

      addConversationMessage(userId, "user", message.trim());
      addConversationMessage(userId, "assistant", responseText);

      return res.json({
        success: true,
        response: responseText,
        modelUsed: "instant-intent-retrieval",
        openSection: "tasks",
        memorySaved: false,
        memory: null,
      });
    }

    // 2D. Only save a memory if it is an actual declarative statement, NOT a question
    let savedMemory = null;
    if (!isQuestionOrRecall && (
      lowerMessage.startsWith("i love ") ||
      lowerMessage.startsWith("i really love ") ||
      lowerMessage.startsWith("i really like ") ||
      lowerMessage.startsWith("i enjoy ") ||
      lowerMessage.startsWith("my hobby is ") ||
      lowerMessage.startsWith("my favorite ") ||
      lowerMessage.startsWith("my favourite ") ||
      lowerMessage.startsWith("i prefer ")
    )) {
      let type = "PREFERENCE";
      let tags = ["preference"];

      if (
        lowerMessage.includes("gardening") ||
        lowerMessage.includes("garden") ||
        lowerMessage.includes("roses")
      ) {
        type = "HOBBY";
        tags = ["gardening", "roses"];
      }

      savedMemory = saveMemory({
        userId,
        type,
        title: "Personal preference",
        content: message.trim(),
        tags,
        importance: 0.8,
      });
    }

    // ------------------------------------
    // 3. Retrieve recent conversation (short-term context)
    // ------------------------------------

    const recentMessages = getRecentConversation(userId, 5);

    const conversationContext = recentMessages.length > 0
      ? recentMessages.map(m =>
          `${m.role === "user" ? "User" : "Saathi"}: ${m.content}`
        ).join("\n")
      : "No recent conversation.";

    // ------------------------------------
    // 4. Save user message to conversation
    // ------------------------------------

    addConversationMessage(userId, "user", message.trim());

    // ------------------------------------
    // 5. Build Saathi's context
    // ------------------------------------

    const memoryContext = memoriesForAI.length > 0
      ? JSON.stringify(memoriesForAI, null, 2)
      : "No relevant memories found.";

    // ------------------------------------
    // 6. Saathi personality + system prompt
    // ------------------------------------

    const languageInstructions = {
      en: "Respond in clear, natural, warm ENGLISH.",
      hi: "Respond in natural, respectful, soothing HINDI (clean Devanagari script).",
      es: "Respond in warm, gentle SPANISH.",
      fr: "Respond in soft, polite FRENCH.",
      de: "Respond in gentle, friendly GERMAN.",
      bn: "Respond in soft, respectful BENGALI.",
      ta: "Respond in respectful, gentle TAMIL.",
      te: "Respond in polite, gentle TELUGU.",
      mr: "Respond in respectful, gentle MARATHI.",
    };

    const targetLangRule = languageInstructions[language] || "Respond in clear, natural, warm ENGLISH.";

    const systemPrompt = `
You are Saathi, a caring, gentle, and soft-spoken companion robot.

LANGUAGE AND RESPONSE REQUIREMENTS:
- ${targetLangRule}
- Keep your response brief and comforting: 1 to 2 short sentences max.
- CRITICAL: DO NOT constantly repeat the user's name ("Ramesh"). Only use their name very rarely or not at all, so speech sounds natural, humble, and polite.
- Avoid robotic or spooky tones. Speak with gentle warmth.

PERSONALITY:
- Gentle, soothing, attentive, and respectful.
- Conversational and uplifting companion.

LONG-TERM MEMORY:
${memoryContext}

RECENT CONVERSATION:
${conversationContext}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}
`;

    // ------------------------------------
    // 7. Ask Gemini with fast 2-second timeout
    // ------------------------------------

    let aiResponse = null;
    let modelUsed = null;

    for (const model of AI_MODELS) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 3000)
        );
        const apiPromise = ai.models.generateContent({
          model,
          contents: message,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 60,
            temperature: 0.6,
          },
        });
        const response = await Promise.race([apiPromise, timeoutPromise]);
        if (response && response.text) {
          aiResponse = response.text.trim();
          modelUsed = model;
          break;
        }
      } catch (err) {
        console.warn(`Chat model ${model} skipped (${err?.message}), using fast fallback...`);
      }
    }

    // Graceful offline/quota fallback if all models fail (Soft, natural, no name spam)
    if (!aiResponse) {
      if (lowerMessage.includes("garden") || lowerMessage.includes("rose") || lowerMessage.includes("flower")) {
        aiResponse = language === "hi" 
          ? "बगीचे में गुलाबों की देखभाल करना सच में मन को बहुत सुकून देता है।" 
          : "Tending to your garden always brings such peace and beauty.";
      } else if (lowerMessage.includes("fishing") || lowerMessage.includes("fish")) {
        aiResponse = language === "hi"
          ? "शाम को पानी के पास बैठना और मछली पकड़ना कितना शांत अनुभव है।"
          : "Fishing in the evenings sounds so peaceful. Sitting quietly by the water is truly relaxing.";
      } else if (lowerMessage.includes("railway") || lowerMessage.includes("train") || lowerMessage.includes("work") || lowerMessage.includes("office")) {
        aiResponse = language === "hi"
          ? "रेलवे के वे साल बहुत सारी यादगार और खूबसूरत कहानियों से भरे हैं।"
          : "Those years with the railways hold so many wonderful memories and stories.";
      } else if (lowerMessage.includes("daughter") || lowerMessage.includes("priya")) {
        aiResponse = language === "hi"
          ? "प्रिया आपको बहुत याद करती हैं और हमेशा आपके बारे में सोचती हैं।"
          : "Priya loves you very much and is always keeping you in her thoughts.";
      } else if (lowerMessage.includes("son") || lowerMessage.includes("amit")) {
        aiResponse = language === "hi"
          ? "अमित बिल्कुल ठीक हैं और हमेशा आपका हालचाल पूछते हैं।"
          : "Amit is doing well and thinks of you often.";
      } else if (lowerMessage.includes("family")) {
        aiResponse = language === "hi"
          ? "आपका परिवार आपसे बहुत प्यार करता है।"
          : "Your family loves you very much and they are always close at heart.";
      } else if (lowerMessage.includes("tea") || lowerMessage.includes("chai")) {
        aiResponse = language === "hi"
          ? "गर्मागर्म चाय का एक कप सच में ताजगी दे देता है।"
          : "A warm cup of tea sounds lovely right now. Take a nice relaxing break.";
      } else if (lowerMessage.includes("peanut") || lowerMessage.includes("snack")) {
        aiResponse = language === "hi"
          ? "चाय के साथ भुनी हुई मूँगफली का स्वाद सच में बहुत बढ़िया होता है।"
          : "Roasted peanuts with tea are such a delightful treat.";
      } else if (lowerMessage.includes("medicine") || lowerMessage.includes("pill") || lowerMessage.includes("doctor") || lowerMessage.includes("health")) {
        aiResponse = language === "hi"
          ? "आपकी सेहत सबसे ज़रूरी है। कृपया समय पर दवाई लें और आराम करें।"
          : "Your health is so important. Please take your medicine on time and rest comfortably.";
      } else if (lowerMessage.includes("good morning") || lowerMessage.startsWith("morning")) {
        aiResponse = language === "hi"
          ? "शुभ प्रभात! आज का दिन आपके लिए सुखद और मंगलमय हो।"
          : "Good morning! Wishing you a peaceful and lovely day ahead.";
      } else if (lowerMessage.includes("good evening") || lowerMessage.startsWith("evening")) {
        aiResponse = language === "hi"
          ? "शुभ संध्या! आपका दिन कैसा रहा?"
          : "Good evening! I hope you had a pleasant and relaxing day.";
      } else if (lowerMessage.includes("tired") || lowerMessage.includes("sleep") || lowerMessage.includes("rest")) {
        aiResponse = language === "hi"
          ? "आराम करना बहुत ज़रूरी है। आप थोड़ा विश्राम कर लीजिए।"
          : "Rest is so essential. Please take it easy and relax comfortably.";
      } else if (lowerMessage.includes("happy") || lowerMessage.includes("great") || lowerMessage.includes("wonderful")) {
        aiResponse = language === "hi"
          ? "यह सुनकर बहुत अच्छा लगा! आपको खुश देखकर मन प्रसन्न हो जाता है।"
          : "That is wonderful to hear! It brings a smile to know you are doing well.";
      } else {
        const genericFallbacks = language === "hi" ? [
          "मैं आपकी बात सुन रहा हूँ। कृपया और बताइए।",
          "यह बहुत दिलचस्प बात है। क्या आप इसके बारे में थोड़ा और बताएँगे?",
          "मैं हमेशा आपके साथ हूँ। आज आपके मन में क्या विचार है?",
          "मैं ध्यान से सुन रहा हूँ, आप अपनी बात जारी रखें।",
          "यह साझा करने के लिए धन्यवाद। मुझे आपकी बातें सुनना बहुत अच्छा लगता है।",
          "मैं समझ गया। जब भी बात करनी हो, मैं यहीं हूँ।",
        ] : [
          "I am listening carefully. Please feel free to tell me more.",
          "That is wonderful. Would you like to share a little more about that?",
          "I am right here with you. What is on your mind today?",
          "I am listening. Please go ahead.",
          "Thank you for sharing that. It is always a pleasure talking with you.",
          "I understand. I am always right here whenever you need company.",
          "I am here for you. How can I help make your day brighter?",
        ];
        const idx = Math.floor(Date.now() / 5000) % genericFallbacks.length;
        aiResponse = genericFallbacks[idx];
      }
    }

    // ------------------------------------
    // 8. Save Saathi's response to conversation
    // ------------------------------------

    addConversationMessage(userId, "assistant", aiResponse);

    // ------------------------------------
    // 9. Send response
    // ------------------------------------

    res.json({
      success: true,
      response: aiResponse,
      modelUsed,
      memorySaved: Boolean(savedMemory),
      memory: savedMemory,
    });

  } catch (error) {
    console.error("========== CHAT ERROR ==========");
    console.error("Message:", error?.message);
    console.error("Full error:", error);
    console.error("================================");

    res.status(500).json({
      success: false,
      error: error?.message || "Saathi could not process the message",
    });
  }
});

// ------------------------------------
// TEST CONVERSATION STORAGE
// ------------------------------------

app.post("/api/conversation/test", (req, res) => {
  const {
    userId = "ramesh-001",
    message,
  } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: "Message is required",
    });
  }

  addConversationMessage(userId, "user", message.trim());

  const conversation = getConversation(userId);

  res.json({
    success: true,
    conversation,
  });
});

// ------------------------------------
// CONVERSATION API (Step 5C)
// ------------------------------------

app.get("/api/conversation/:userId", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const messages = getRecentConversation(req.params.userId, limit);

  res.json({
    success: true,
    messages,
  });
});

// ------------------------------------
// CLEAR CONVERSATION (Step 5D)
// ------------------------------------

app.delete("/api/conversation/:userId", (req, res) => {
  clearConversation(req.params.userId);

  res.json({
    success: true,
    message: "Conversation cleared",
  });
});

// ------------------------------------
// DAILY CHECK-IN ENGINE (Step 5E)
// ------------------------------------

app.get("/api/checkin/:userId", (req, res) => {
  if (req.params.userId !== user.id) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const hour = new Date().getHours();
  const name = user.preferredName || user.name;

  // Time-based greeting
  let greeting, timeMessage;
  if (hour < 12) {
    greeting = `Good morning, ${name}`;
    timeMessage = "How are you feeling this morning?";
  } else if (hour < 17) {
    greeting = `Good afternoon, ${name}`;
    timeMessage = "Have you had your afternoon break?";
  } else {
    greeting = `Good evening, ${name}`;
    timeMessage = "Would you like to tell me about your day?";
  }

  // Pick a suggested topic from preferences
  const topicOptions = [
    { pref: "gardening", topic: "Would you like to talk about your garden?" },
    { pref: "railway", topic: "Would you like to share a memory from your railway days?" },
    { pref: "family", topic: "Would you like to talk about your family?" },
    { pref: "morning", topic: "It's a lovely time for a conversation." },
  ];

  // Rotate topic based on day-of-year to avoid repeating
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const topicIndex = dayOfYear % topicOptions.length;
  const suggestedTopic = topicOptions[topicIndex].topic;

  res.json({
    success: true,
    checkin: {
      greeting,
      message: timeMessage,
      suggestedTopic,
      actions: ["Chat", "Remind me later", "I'm fine"],
    },
  });
});

// ------------------------------------
// TASK MANAGEMENT API (Step 5F)
// ------------------------------------

// GET all tasks
app.get("/api/tasks/:userId", (req, res) => {
  const userTasks = tasks.filter(t => t.userId === req.params.userId);

  res.json({
    success: true,
    tasks: userTasks,
  });
});

// POST create task
app.post("/api/tasks/:userId", (req, res) => {
  const { title, time, period } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Title is required",
    });
  }

  const newTask = {
    id: `task-${Date.now()}`,
    userId: req.params.userId,
    title,
    time: time || "12:00",
    period: period || "Afternoon",
    completed: false,
  };

  tasks.push(newTask);

  res.json({
    success: true,
    task: newTask,
  });
});

// PATCH update task
app.patch("/api/tasks/:userId/:taskId", (req, res) => {
  const task = tasks.find(
    t => t.id === req.params.taskId && t.userId === req.params.userId
  );

  if (!task) {
    return res.status(404).json({
      success: false,
      error: "Task not found",
    });
  }

  if (req.body.completed !== undefined) task.completed = req.body.completed;
  if (req.body.title) task.title = req.body.title;
  if (req.body.time) task.time = req.body.time;
  if (req.body.period) task.period = req.body.period;

  res.json({
    success: true,
    task,
  });
});

// DELETE task
app.delete("/api/tasks/:userId/:taskId", (req, res) => {
  const index = tasks.findIndex(
    t => t.id === req.params.taskId && t.userId === req.params.userId
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "Task not found",
    });
  }

  tasks.splice(index, 1);

  res.json({
    success: true,
    message: "Task deleted",
  });
});

// ------------------------------------
// NATURAL LANGUAGE TASK PARSING (Step 5G)
// ------------------------------------

app.post("/api/tasks/:userId/parse", (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: "Message is required",
    });
  }

  const lower = message.toLowerCase();

  // Extract title: remove common prefixes
  let title = message.trim();
  const prefixes = [
    "remind me to", "remember to", "add task to",
    "add task", "add", "remind me", "remember",
  ];
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      title = message.trim().slice(prefix.length).trim();
      break;
    }
  }

  // Extract time
  let time = null;
  let period = "Afternoon";

  // Match "at 5pm", "at 5:30pm", "at 17:00"
  const timeMatch = title.match(
    /\s+at\s+(\d{1,2})(:\d{2})?\s*(am|pm)?\s*$/i
  );

  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? timeMatch[2].slice(1) : "00";
    const ampm = timeMatch[3]?.toLowerCase();

    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    time = `${String(hours).padStart(2, "0")}:${minutes}`;

    // Remove time from title
    title = title.replace(/\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm)?\s*$/i, "").trim();
  }

  // 24-hour time match "at 17:00"
  if (!time) {
    const time24Match = title.match(/\s+at\s+(\d{2}):(\d{2})\s*$/i);
    if (time24Match) {
      time = `${time24Match[1]}:${time24Match[2]}`;
      title = title.replace(/\s+at\s+\d{2}:\d{2}\s*$/i, "").trim();
    }
  }

  if (!time) time = "12:00";

  // Determine period from time
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) period = "Morning";
  else if (hour < 17) period = "Afternoon";
  else period = "Evening";

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  res.json({
    success: true,
    task: {
      title,
      time,
      period,
    },
  });
});

// ------------------------------------
// STORY MODE (Step 5H)
// ------------------------------------

app.post("/api/stories/:userId", (req, res) => {
  const { story } = req.body;

  if (!story || !story.trim()) {
    return res.status(400).json({
      success: false,
      error: "Story content is required",
    });
  }

  const lower = story.toLowerCase();
  const name = user.preferredName || "User";

  // Deterministic title generation
  let title = `${name}'s Story`;
  const titleMap = [
    { keyword: "railway", title: "A Railway Memory" },
    { keyword: "train", title: "A Railway Memory" },
    { keyword: "school", title: "A School Memory" },
    { keyword: "college", title: "A College Memory" },
    { keyword: "childhood", title: "A Childhood Memory" },
    { keyword: "child", title: "A Childhood Memory" },
    { keyword: "young", title: "A Youth Memory" },
    { keyword: "family", title: "A Family Memory" },
    { keyword: "daughter", title: "A Family Memory" },
    { keyword: "son", title: "A Family Memory" },
    { keyword: "wife", title: "A Family Memory" },
    { keyword: "husband", title: "A Family Memory" },
    { keyword: "garden", title: "A Gardening Memory" },
    { keyword: "rose", title: "A Gardening Memory" },
    { keyword: "flower", title: "A Gardening Memory" },
    { keyword: "work", title: "A Work Memory" },
    { keyword: "office", title: "A Work Memory" },
    { keyword: "wedding", title: "A Wedding Memory" },
    { keyword: "marriage", title: "A Wedding Memory" },
    { keyword: "travel", title: "A Travel Memory" },
    { keyword: "trip", title: "A Travel Memory" },
    { keyword: "festival", title: "A Festival Memory" },
    { keyword: "diwali", title: "A Festival Memory" },
    { keyword: "friend", title: "A Friendship Memory" },
  ];

  for (const entry of titleMap) {
    if (lower.includes(entry.keyword)) {
      title = entry.title;
      break;
    }
  }

  // Generate tags from keywords
  const tagKeywords = [
    "railway", "train", "school", "childhood", "family",
    "garden", "roses", "work", "office", "travel",
    "festival", "friend", "wedding", "youth",
  ];
  const tags = tagKeywords.filter(kw => lower.includes(kw));
  if (tags.length === 0) tags.push("story", "personal");

  const savedStory = saveMemory({
    userId: req.params.userId,
    type: "LIFE_STORY",
    title,
    content: story.trim(),
    tags,
    importance: 0.8,
  });

  res.json({
    success: true,
    story: savedStory,
  });
});

// ------------------------------------
// STORY LIST (Step 5I)
// ------------------------------------

app.get("/api/stories/:userId", (req, res) => {
  const allMemories = getUserMemories(req.params.userId);
  const stories = allMemories.filter(m => m.type === "LIFE_STORY");

  res.json({
    success: true,
    stories,
  });
});

// ------------------------------------
// STORY SUMMARY (Step 5J)
// ------------------------------------

app.post("/api/stories/:userId/:memoryId/summarize", (req, res) => {
  const allMemories = getUserMemories(req.params.userId);
  const memory = allMemories.find(m => m.id === req.params.memoryId);

  if (!memory) {
    return res.status(404).json({
      success: false,
      error: "Story not found",
    });
  }

  // Deterministic summary from first 1-2 sentences
  const sentences = memory.content
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0);

  const summary = sentences.length > 1
    ? sentences.slice(0, 2).join(". ").trim() + "."
    : sentences[0]?.trim() + "." || memory.content.slice(0, 100);

  res.json({
    success: true,
    summary,
  });
});

// ------------------------------------
// FAMILY SUMMARY (Step 5L)
// ------------------------------------

app.get("/api/family/:userId/summary", (req, res) => {
  if (req.params.userId !== user.id) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const userTasks = tasks.filter(t => t.userId === req.params.userId);
  const completedTasks = userTasks.filter(t => t.completed).length;
  const pendingTasks = userTasks.filter(t => !t.completed).length;

  const allMemories = getUserMemories(req.params.userId);
  const todayStories = allMemories.filter(m => {
    if (m.type !== "LIFE_STORY") return false;
    const created = new Date(m.createdAt);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  });

  const conversation = getConversation(req.params.userId);
  const interactionCount = conversation.filter(m => m.role === "user").length;

  // Build highlights from tasks and memories
  const highlights = [];

  const completedTaskList = userTasks.filter(t => t.completed);
  completedTaskList.forEach(t => {
    highlights.push(`${t.title} was completed`);
  });

  if (todayStories.length > 0) {
    highlights.push(`${user.preferredName} shared a story`);
  }

  // Check recent topics from conversation
  const recentConv = getRecentConversation(req.params.userId, 5);
  recentConv.forEach(m => {
    if (m.role === "user") {
      const lower = m.content.toLowerCase();
      if (lower.includes("garden")) highlights.push(`${user.preferredName} talked about gardening`);
      if (lower.includes("railway")) highlights.push(`${user.preferredName} talked about railway memories`);
    }
  });

  // De-duplicate highlights
  const uniqueHighlights = [...new Set(highlights)].slice(0, 5);

  // Mock mood
  const moods = ["Content", "Cheerful", "Calm", "Relaxed"];
  const moodIndex = new Date().getDate() % moods.length;

  res.json({
    success: true,
    summary: {
      userName: user.preferredName,
      completedTasks,
      pendingTasks,
      storiesSharedToday: todayStories.length,
      interactionCount,
      highlights: uniqueHighlights.length > 0
        ? uniqueHighlights
        : [`${user.preferredName}'s day is just getting started`],
      mood: moods[moodIndex],
    },
  });
});

// ------------------------------------
// FAMILY DASHBOARD API (Step 5M)
// ------------------------------------

app.get("/api/family/:userId/dashboard", (req, res) => {
  if (req.params.userId !== user.id) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const userTasks = tasks.filter(t => t.userId === req.params.userId);
  const completedCount = userTasks.filter(t => t.completed).length;
  const pendingCount = userTasks.filter(t => !t.completed).length;

  const allMemories = getUserMemories(req.params.userId);
  const recentStories = allMemories
    .filter(m => m.type === "LIFE_STORY")
    .slice(-5);

  const recentConv = getRecentConversation(req.params.userId, 10);
  const conversation = getConversation(req.params.userId);
  const interactionCount = conversation.filter(m => m.role === "user").length;

  // Interaction highlights
  const highlights = [];
  const completedTaskList = userTasks.filter(t => t.completed);
  completedTaskList.forEach(t => highlights.push(`${t.title} was completed`));

  recentConv.forEach(m => {
    if (m.role === "user") {
      const lower = m.content.toLowerCase();
      if (lower.includes("garden")) highlights.push(`${user.preferredName} talked about gardening`);
      if (lower.includes("railway")) highlights.push(`${user.preferredName} shared a railway memory`);
      if (lower.includes("family")) highlights.push(`${user.preferredName} talked about family`);
    }
  });

  if (recentStories.length > 0) {
    highlights.push(`${user.preferredName} shared a story`);
  }

  const uniqueHighlights = [...new Set(highlights)].slice(0, 5);

  // Mock alerts
  const alerts = [];
  const pendingTasks = userTasks.filter(t => !t.completed);
  if (pendingTasks.length > 0) {
    alerts.push({
      type: "TASK",
      severity: "INFO",
      message: `${pendingTasks.length} task${pendingTasks.length > 1 ? "s" : ""} still pending today`,
    });
  }

  if (interactionCount === 0) {
    alerts.push({
      type: "INTERACTION",
      severity: "INFO",
      message: `${user.preferredName} hasn't chatted with Saathi today yet`,
    });
  }

  // Mock mood
  const moods = ["Content", "Cheerful", "Calm", "Relaxed"];
  const moodIndex = new Date().getDate() % moods.length;

  res.json({
    success: true,
    dashboard: {
      profile: {
        id: user.id,
        name: user.name,
        preferredName: user.preferredName,
        age: user.age,
        location: user.location,
      },
      family: user.family,
      recentStories,
      todayTasks: userTasks,
      completedTasks: completedCount,
      pendingTasks: pendingCount,
      interactionCount,
      interactionHighlights: uniqueHighlights.length > 0
        ? uniqueHighlights
        : [`${user.preferredName}'s day is just getting started`],
      recentConversation: recentConv,
      mood: moods[moodIndex],
      alerts,
    },
  });
});

// ------------------------------------
// FAMILY ACTIONS - Mock (Step 5N)
// ------------------------------------

app.post("/api/family/:userId/:familyMemberId/call", (req, res) => {
  const familyMember = user.family.find(
    f => f.id === req.params.familyMemberId
  );

  res.json({
    success: true,
    action: "call",
    familyMember: familyMember?.name || "Unknown",
    message: `Call to ${familyMember?.name || "family member"} simulated (prototype action)`,
  });
});

app.post("/api/family/:userId/:familyMemberId/message", (req, res) => {
  const familyMember = user.family.find(
    f => f.id === req.params.familyMemberId
  );

  res.json({
    success: true,
    action: "message",
    familyMember: familyMember?.name || "Unknown",
    message: `Message to ${familyMember?.name || "family member"} simulated (prototype action)`,
  });
});

// ------------------------------------
// SHARE TODAY'S SUMMARY (Step 5O)
// ------------------------------------

app.post("/api/family/:userId/share-summary", (req, res) => {
  if (req.params.userId !== user.id) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const userTasks = tasks.filter(t => t.userId === req.params.userId);
  const completed = userTasks.filter(t => t.completed);
  const name = user.preferredName;

  // Build friendly summary
  const parts = [`Today, ${name}`];

  if (completed.length > 0) {
    const taskNames = completed.map(t => t.title.toLowerCase()).join(", ");
    parts.push(`completed: ${taskNames}`);
  }

  // Check conversations for topics
  const recentConv = getRecentConversation(req.params.userId, 10);
  const topics = new Set();

  recentConv.forEach(m => {
    if (m.role === "user") {
      const lower = m.content.toLowerCase();
      if (lower.includes("garden")) topics.add("spent some time thinking about his garden");
      if (lower.includes("railway")) topics.add("shared a story about his railway days");
      if (lower.includes("family")) topics.add("talked about family");
    }
  });

  if (topics.size > 0) {
    parts.push(Array.from(topics).join(", "));
  }

  const allMemories = getUserMemories(req.params.userId);
  const todayStories = allMemories.filter(m => {
    if (m.type !== "LIFE_STORY") return false;
    const created = new Date(m.createdAt);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  });

  if (todayStories.length > 0) {
    parts.push(`shared ${todayStories.length} stor${todayStories.length > 1 ? "ies" : "y"}`);
  }

  let summaryText;
  if (parts.length <= 1) {
    summaryText = `${name} had a quiet day. Everything is going well.`;
  } else {
    summaryText = parts.join(", ") + ". Everything is going well.";
  }

  res.json({
    success: true,
    message: summaryText,
    sharedWith: user.family.map(f => ({
      name: f.name,
      relation: f.relation,
    })),
  });
});

// ------------------------------------
// ROBOT SIMULATOR APIs
// ------------------------------------

app.get("/api/robot/status", (req, res) => {
  res.json({
    success: true,
    status: {
      mode: "SIMULATOR",
      state: "idle",
      battery: 85,
      connected: true,
      capabilities: ["listen", "think", "speak", "checkin"],
    },
  });
});

app.post("/api/robot/listen", (req, res) => {
  const { text } = req.body;
  res.json({
    success: true,
    action: "listen",
    input: text || "(simulated audio input)",
    message: "Robot heard the input (simulated)",
  });
});

app.post("/api/robot/speak", (req, res) => {
  const { text } = req.body;
  res.json({
    success: true,
    action: "speak",
    output: text || "Hello, I am Saathi.",
    message: "Robot spoke the text (simulated)",
  });
});

app.post("/api/robot/action", (req, res) => {
  const { action } = req.body;
  res.json({
    success: true,
    action: action || "unknown",
    message: `Robot action '${action || "unknown"}' simulated`,
  });
});

app.post("/api/robot/checkin", (req, res) => {
  const hour = new Date().getHours();
  const name = user.preferredName;

  let greeting;
  if (hour < 12) greeting = `Good morning, ${name} ji. How are you feeling today?`;
  else if (hour < 17) greeting = `Hello, ${name} ji. Have you had your afternoon break?`;
  else greeting = `Good evening, ${name} ji. Would you like to tell me about your day?`;

  res.json({
    success: true,
    action: "checkin",
    greeting,
    message: "Robot check-in simulated",
  });
});

// ------------------------------------
// Start Server
// ------------------------------------

const PORT = 3000;

app.listen(PORT, () => {
  console.log(
    `Saathi AI Brain running on http://localhost:${PORT}`
  );
});