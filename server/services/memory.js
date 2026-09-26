import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ------------------------------------
// File location
// ------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_FILE = path.join(
  __dirname,
  "../data/memory.json"
);

// ------------------------------------
// Read memory database
// ------------------------------------

function readMemoryDatabase() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return {
        users: {},
        memories: [],
      };
    }

    const data = fs.readFileSync(
      MEMORY_FILE,
      "utf-8"
    );

    return JSON.parse(data);

  } catch (error) {
    console.error("Memory read error:", error);

    return {
      users: {},
      memories: [],
    };
  }
}

// ------------------------------------
// Save memory database
// ------------------------------------

function writeMemoryDatabase(database) {
  try {
    fs.writeFileSync(
      MEMORY_FILE,
      JSON.stringify(database, null, 2),
      "utf-8"
    );

    return true;

  } catch (error) {
    console.error("Memory write error:", error);

    return false;
  }
}

// ------------------------------------
// Save a new memory
// ------------------------------------

export function saveMemory({
  userId,
  type,
  title,
  content,
  tags = [],
  importance = 0.5,
}) {

  const database = readMemoryDatabase();

  const memory = {
    id: `mem_${Date.now()}`,

    userId,

    type,

    title,

    content,

    tags,

    importance,

    createdAt: new Date().toISOString(),
  };

  database.memories.push(memory);

  writeMemoryDatabase(database);

  return memory;
}

// ------------------------------------
// Get all memories for a user
// ------------------------------------

export function getUserMemories(userId) {

  const database = readMemoryDatabase();

  return database.memories.filter(
    memory => memory.userId === userId
  );
}

// ------------------------------------
// Search memories
// ------------------------------------

export function searchMemories(
  userId,
  searchText
) {

  const database = readMemoryDatabase();

  const memories = database.memories.filter(
    memory => memory.userId === userId
  );

  const query = searchText
    .toLowerCase()
    .trim();

  if (!query) {
    return memories;
  }

  const words = query
    .split(/\s+/)
    .filter(Boolean);

  const scored = memories.map(memory => {

    const searchableText = `
      ${memory.title}
      ${memory.content}
      ${memory.tags.join(" ")}
    `.toLowerCase();

    let score = 0;

    for (const word of words) {

      if (searchableText.includes(word)) {
        score++;
      }
    }

    return {
      ...memory,
      relevance: score,
    };
  });

  return scored
    .filter(memory => memory.relevance > 0)
    .sort(
      (a, b) => b.relevance - a.relevance
    );
}

// ------------------------------------
// Delete memory
// ------------------------------------

export function deleteMemory(
  userId,
  memoryId
) {

  const database = readMemoryDatabase();

  const originalLength =
    database.memories.length;

  database.memories =
    database.memories.filter(
      memory =>
        !(
          memory.id === memoryId &&
          memory.userId === userId
        )
    );

  writeMemoryDatabase(database);

  return database.memories.length <
    originalLength;
}