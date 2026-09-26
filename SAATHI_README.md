# 🤖 SAATHI — AI Companion for Elderly People

> **Remember. Understand. Assist. Connect.**

SAATHI is a software-first AI companion designed for elderly people. It is built to remember personal stories and preferences, assist with daily activities, proactively interact with the user, connect them with family, and eventually serve as the intelligence layer behind a physical companion robot.

This repository contains the hackathon prototype and its AI/backend foundation.

---

## 🌟 Problem Statement

Elderly people may need more than a conventional reminder application or chatbot. They can benefit from a companion that understands their routines, remembers meaningful experiences, provides simple assistance, and helps maintain connection with family.

SAATHI aims to create that companion experience through a combination of:

- Conversational AI
- Long-term personal memory
- Conversation history
- Daily task assistance
- Proactive check-ins
- Voice interaction
- Family connection
- A future robot API/simulator

---

## 💡 What is SAATHI?

SAATHI is designed around one elderly user rather than acting as a generic chatbot.

For example, SAATHI's demo user **Ramesh Patil** has preferences and memories such as:

- Enjoys gardening
- Especially likes growing roses
- Likes talking about his railway career
- Enjoys morning conversations
- Values family conversations

Instead of treating every conversation as new, SAATHI is designed to build a persistent personal context around the user.

### The core idea

```text
                 SAATHI
                    │
       ┌────────────┼────────────┐
       │            │            │
   Conversation   Memory       Tasks
       │            │            │
       └────────────┼────────────┘
                    │
             Proactive AI
                    │
          ┌─────────┴─────────┐
          │                   │
        Voice               Family
       STT / TTS          Connection
          │                   │
          └─────────┬─────────┘
                    │
                Robot API
                    │
             FUTURE ROBOT
```

---

## 🚀 Current Prototype

The current implementation focuses on the software intelligence layer.

### Implemented / Foundation

- Node.js + Express backend
- Gemini-powered conversational AI
- Environment-based Gemini API configuration
- Elderly user profile and demo data
- Long-term memory storage
- AI-assisted memory extraction
- Memory search and retrieval
- Conversation history foundation
- Demo daily tasks
- Family member data
- REST API architecture
- Error handling and fallback planning

### Planned / In Progress

- Proactive check-ins
- Natural-language task creation
- Story mode
- Memory graph
- Family dashboard
- Speech-to-text
- Text-to-speech
- Robot API
- Robot simulator
- Complete frontend integration
- Final hackathon demo flow

---

## 🧠 AI Architecture

SAATHI uses Gemini as its conversational reasoning layer while keeping application data and memory under the application's own backend.

```text
User
 │
 ▼
SAATHI UI
 │
 ▼
Node.js / Express API
 │
 ├── User Profile
 ├── Conversation History
 ├── Long-Term Memory
 ├── Tasks
 ├── Family
 └── Proactive Interaction
 │
 ▼
Gemini AI
 │
 ▼
Personalized SAATHI Response
```

The architecture separates **long-term memory** from **short-term conversation history**.

### Long-term memory

Important personal information such as:

- Preferences
- Life stories
- Family information
- Interests

### Conversation history

Recent dialogue used to maintain continuity during conversations.

---

## 🤖 Future Robot Architecture

SAATHI is intentionally designed as a **software-first system**.

The hackathon prototype does not require physical hardware.

The future architecture is:

```text
             SAATHI AI BRAIN
                    │
              Robot API
                    │
             ┌──────┴──────┐
             │             │
        Future Robot    Simulator
             │
      ┌──────┼───────┐
      │      │       │
 Microphone Speaker Sensors
```

This allows the future physical robot to use SAATHI as its intelligence layer instead of rebuilding the AI system from scratch.

---

## 👴 Demo User

### Ramesh Patil

- Age: 68
- Location: Nashik
- Preferred name: Ramesh
- Language: English

### Preferences

- Likes morning conversations
- Enjoys gardening
- Likes talking about his railway job
- Prefers simple and respectful language
- Enjoys family conversations

### Family

| Name | Relation |
|---|---|
| Meena Patil | Daughter |
| Amit Patil | Son |

---

## 📋 Demo Tasks

The prototype includes sample daily activities:

| Time | Task | Example Status |
|---|---|---|
| 08:00 | Take morning medicine | Completed |
| 13:00 | Call Meena | Pending |
| 17:00 | Water the plants | Pending |
| 17:30 | Walk for 15 minutes | Pending |

These are prototype/demo tasks and are not medical monitoring.

---

## 🛠️ Technology Stack

### Backend

- Node.js
- Express
- JavaScript
- REST APIs
- `@google/genai`
- dotenv
- CORS

### AI

- Google Gemini API
- AI-assisted conversational responses
- AI-assisted memory extraction

### Frontend

The frontend is being integrated with the backend as part of the complete prototype.

### Voice

Planned browser-based:

- Web Speech API / SpeechRecognition
- Web Speech API / speechSynthesis

### Storage

The prototype uses local/demo data and application-side storage rather than a production database.

---

## 📁 Project Structure

The structure may evolve as development continues.

```text
saathi/
│
├── server/
│   ├── index.js
│   │
│   ├── data/
│   │   ├── seed.js
│   │   └── ...
│   │
│   └── services/
│       ├── memory.js
│       ├── memoryExtractor.js
│       ├── conversation.js
│       └── ...
│
├── client/
│   └── ...
│
├── package.json
├── .gitignore
├── .env              # NEVER commit this file
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd saathi
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

**Never commit your API key to GitHub.**

### 4. Start the backend

```bash
node server/index.js
```

You should see:

```text
Saathi AI Brain running on http://localhost:3000
```

### 5. Health check

Open:

```text
http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "Saathi AI Brain",
  "message": "Saathi backend is running"
}
```

---

## 🔌 Important API Endpoints

### Health

```text
GET /api/health
```

### Chat

```text
POST /api/chat
```

Example:

```json
{
  "userId": "ramesh-001",
  "message": "Hello Saathi, how are you?"
}
```

### Memories

```text
GET /api/memory/:userId
GET /api/memory/:userId/search?q=...
POST /api/memory/extract
```

### Conversation

Planned/implemented as development progresses:

```text
GET /api/conversation/:userId
DELETE /api/conversation/:userId
```

### Tasks

```text
GET /api/tasks/:userId
POST /api/tasks/:userId
PATCH /api/tasks/:userId/:taskId
DELETE /api/tasks/:userId/:taskId
```

### Family

```text
GET /api/family/:userId/dashboard
GET /api/family/:userId/summary
POST /api/family/:userId/share-summary
```

### Robot Simulator

```text
GET /api/robot/status
POST /api/robot/listen
POST /api/robot/speak
POST /api/robot/action
POST /api/robot/checkin
```

---

## 🔐 Security

This is a hackathon prototype.

Important:

- Never commit `.env`
- Never expose `GEMINI_API_KEY` in frontend code
- Do not commit API keys to GitHub
- Use environment variables for secrets
- Demo family communication is simulated
- Demo tasks are not a substitute for medical systems

Recommended `.gitignore`:

```text
.env
node_modules/
dist/
```

---

## 🎬 Hackathon Demo Flow

A short demonstration can follow this sequence:

### 1. Meet SAATHI

Show the elderly user's home screen:

> "Good morning, Ramesh ji."

Explain that SAATHI is designed around a specific person.

### 2. Talk to SAATHI

Ask:

> "I love gardening and growing roses."

Show the natural conversational response.

### 3. Show Memory

Open the memory section and demonstrate that gardening/roses can become part of Ramesh's personal context.

### 4. Show Daily Assistance

Open today's tasks and demonstrate completing a task such as:

> "Call Meena"

### 5. Proactive Interaction

Trigger a check-in:

> "Would you like to talk about your garden today?"

Explain that SAATHI can proactively initiate interaction based on time, preferences and routines.

### 6. Voice

Demonstrate speech-to-text and text-to-speech where browser support is available.

### 7. Family

Open the Family Dashboard and show activity summaries, stories and family connection.

### 8. Future Robot

Open the Robot Simulator and explain:

> "The physical robot is the future embodiment. The intelligence layer is being built now."

---

## 🌱 Future Roadmap

### Phase 1 — AI Companion

- Conversational AI
- Long-term memory
- Conversation history
- Personalized responses

### Phase 2 — Daily Assistance

- Tasks
- Reminders
- Proactive check-ins
- Voice interaction

### Phase 3 — Family Ecosystem

- Family dashboard
- Notifications
- Shared summaries
- Caregiver interaction

### Phase 4 — Physical Companion

- Robot hardware integration
- Microphone
- Speaker
- Sensors
- Robot movement
- Local/offline safety layer

### Phase 5 — Intelligent Companion

- More advanced personal memory
- Multilingual conversations
- Personalized routines
- Context-aware interaction
- Safe human-in-the-loop escalation

---

## ⚠️ Prototype Disclaimer

SAATHI is currently a hackathon prototype.

It is **not a medical device**, does not provide medical diagnosis, and should not be used as a replacement for professional medical or caregiving services.

The family communication and robot functions are simulated in the prototype.

---

## 👥 Team

**SAATHI — Hackathon Project**

Built as a collaborative prototype focused on:

- AI
- Full-stack development
- Elderly-friendly UX
- Personal memory
- Voice interaction
- Family connectivity
- Future robotics integration

---

## ❤️ Vision

SAATHI is built around a simple idea:

> **An elderly person should not have to repeatedly explain who they are to their companion.**

The goal is to create an AI companion that remembers the little things, understands routines, encourages meaningful interaction, helps with everyday activities, and keeps loved ones connected.

**Today it is software.  
Tomorrow it can become a robot.**

---

## 📜 License

This project is currently a hackathon prototype. Add the appropriate license before public production use.
