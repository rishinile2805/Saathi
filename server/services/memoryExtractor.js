import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const AI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

// ------------------------------------
// Extract important memories from text
// ------------------------------------

export async function extractMemory(message, userProfile = {}) {
  // ------------------------------------
  // Fast detection for obvious memories
  // ------------------------------------

  const lowerMessage = message.toLowerCase();

  const memoryPatterns = [
    {
      type: "HOBBY",
      keywords: [
        "i love",
        "i really love",
        "i enjoy",
        "i like",
        "i enjoy gardening",
        "my hobby",
        "favorite hobby",
        "favourite hobby"
      ],
      tags: ["preference", "hobby"]
    },
    {
      type: "FAMILY",
      keywords: [
        "my daughter",
        "my son",
        "my wife",
        "my husband",
        "my granddaughter",
        "my grandson",
        "my family"
      ],
      tags: ["family"]
    },
    {
      type: "PREFERENCE",
      keywords: [
        "i prefer",
        "i don't like",
        "i do not like",
        "my favorite",
        "my favourite"
      ],
      tags: ["preference"]
    }
  ];

  const matchedPattern = memoryPatterns.find(pattern =>
    pattern.keywords.some(keyword =>
      lowerMessage.includes(keyword)
    )
  );

  if (matchedPattern) {

    return {
      shouldSave: true,
      type: matchedPattern.type,
      title: "Personal preference",
      content: message.trim(),
      tags: matchedPattern.tags,
      importance: 0.8
    };
  }

  const prompt = `
You are Saathi's memory extraction system.

Your job is to identify PERSONAL information that
would be useful to remember in future conversations.

IMPORTANT:
If the user expresses a lasting personal preference,
hobby, family relationship, life experience, routine,
or meaningful personal fact, you SHOULD save it.

Examples that SHOULD be remembered:

"I love gardening."
"I especially enjoy growing roses."
"My daughter's name is Priya."
"I worked at the railway office for 30 years."
"I prefer morning conversations."
"My wife and I got married in 1975."
"I used to teach mathematics."
"I enjoy listening to old Hindi songs."

Examples that should NOT be remembered:

"What's the weather?"
"What time is it?"
"Tell me a joke."
"Who is the Prime Minister?"
"How does a computer work?"

User profile:
${JSON.stringify(userProfile, null, 2)}

User message:
"${message}"

Return ONLY valid JSON.

If the message contains useful personal information:

{
  "shouldSave": true,
  "type": "HOBBY",
  "title": "Short meaningful title",
  "content": "A concise description of the personal information.",
  "tags": ["tag1", "tag2"],
  "importance": 0.8
}

If the message contains no useful personal information:

{
  "shouldSave": false,
  "type": null,
  "title": null,
  "content": null,
  "tags": [],
  "importance": 0
}

Allowed types:

LIFE
FAMILY
PREFERENCE
ROUTINE
HOBBY
STORY
OTHER

Importance:

0.1 - 0.3 = minor information
0.4 - 0.6 = useful information
0.7 - 0.9 = important personal information
1.0 = extremely important
`;

  let lastError = null;

  for (const model of AI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      console.log(`Memory extractor (${model}) response:`, text);

      const parsed = JSON.parse(text);
      const result = Array.isArray(parsed) ? parsed[0] : parsed;
      if (result && typeof result === "object") {
        return {
          shouldSave: Boolean(result.shouldSave),
          type: result.type || "OTHER",
          title: result.title || "Personal note",
          content: result.content || message.trim(),
          tags: Array.isArray(result.tags) ? result.tags : [],
          importance: typeof result.importance === "number" ? result.importance : 0.7,
        };
      }
    } catch (error) {
      lastError = error;
      console.warn(`Memory extractor with ${model} failed (${error?.status || error?.message}), trying next...`);
    }
  }

  console.error("All AI models failed in memoryExtractor:", lastError?.message);

  return {
    shouldSave: false,
    type: null,
    title: null,
    content: null,
    tags: [],
    importance: 0,
  };
}