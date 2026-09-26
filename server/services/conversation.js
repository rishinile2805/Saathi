import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const conversationFile = path.join(
  __dirname,
  "../data/conversations.json"
);


// ------------------------------------
// Load conversations
// ------------------------------------

function loadConversations() {

  try {

    if (!fs.existsSync(conversationFile)) {
      return {};
    }

    const data =
      fs.readFileSync(
        conversationFile,
        "utf-8"
      );

    return data
      ? JSON.parse(data)
      : {};

  } catch (error) {

    console.error(
      "Could not load conversations:",
      error
    );

    return {};
  }
}


// ------------------------------------
// Save conversations
// ------------------------------------

function saveConversations(data) {

  fs.writeFileSync(

    conversationFile,

    JSON.stringify(
      data,
      null,
      2
    ),

    "utf-8"
  );
}


// ------------------------------------
// Get conversation
// ------------------------------------

export function getConversation(userId) {

  const conversations =
    loadConversations();

  return conversations[userId] || [];
}


// ------------------------------------
// Add message
// ------------------------------------

export function addConversationMessage(
  userId,
  role,
  content
) {

  const conversations =
    loadConversations();

  if (!conversations[userId]) {
    conversations[userId] = [];
  }

  conversations[userId].push({

    role,

    content,

    timestamp:
      new Date().toISOString(),

  });

  // Keep only the latest 20 messages
  // so the AI context doesn't grow forever.

  if (
    conversations[userId].length > 20
  ) {

    conversations[userId] =
      conversations[userId].slice(-20);

  }

  saveConversations(
    conversations
  );

  return conversations[userId];
}


// ------------------------------------
// Get recent conversation (limited)
// ------------------------------------

export function getRecentConversation(
  userId,
  limit = 10
) {
  const messages = getConversation(userId);
  return messages.slice(-limit);
}


// ------------------------------------
// Clear conversation
// ------------------------------------

export function clearConversation(userId) {
  const conversations = loadConversations();
  conversations[userId] = [];
  saveConversations(conversations);
  return true;
}