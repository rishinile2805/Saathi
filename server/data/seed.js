// ==========================================
// SAATHI - DEMO DATA
// ==========================================

// ------------------------------------------
// Elderly User Profile
// ------------------------------------------

export const user = {
  id: "ramesh-001",

  name: "Ramesh Patil",

  preferredName: "Ramesh",

  age: 68,

  language: "English",

  location: "Nashik",

  preferences: [
    "Likes morning conversations",
    "Enjoys gardening",
    "Likes talking about his railway job",
    "Prefers simple and respectful language",
    "Enjoys family conversations"
  ],

  family: [
    {
      id: "meena-001",
      name: "Meena Patil",
      relation: "Daughter",
      contactMethod: "Phone"
    },
    {
      id: "amit-001",
      name: "Amit Patil",
      relation: "Son",
      contactMethod: "Phone"
    }
  ]
};


// ------------------------------------------
// Saathi's Initial Memories
// ------------------------------------------

export const memories = [

  {
    id: "memory-001",

    userId: "ramesh-001",

    type: "LIFE",

    title: "Railway Career",

    content:
      "Ramesh worked at a railway office when he was younger.",

    tags: [
      "work",
      "railway",
      "youth"
    ],

    importance: 0.9
  },

  {
    id: "memory-002",

    userId: "ramesh-001",

    type: "PREFERENCE",

    title: "Love for Gardening",

    content:
      "Ramesh enjoys gardening and especially likes growing roses.",

    tags: [
      "gardening",
      "roses",
      "hobby"
    ],

    importance: 0.8
  },

  {
    id: "memory-003",

    userId: "ramesh-001",

    type: "FAMILY",

    title: "Daughter Meena",

    content:
      "Ramesh's daughter Meena regularly checks in on him.",

    tags: [
      "family",
      "daughter",
      "Meena"
    ],

    importance: 0.9
  }

];


// ------------------------------------------
// Today's Tasks
// ------------------------------------------

export const tasks = [

  {
    id: "task-001",

    userId: "ramesh-001",

    title: "Take morning medicine",

    time: "08:00",

    period: "Morning",

    completed: true
  },

  {
    id: "task-002",

    userId: "ramesh-001",

    title: "Call Meena",

    time: "13:00",

    period: "Afternoon",

    completed: false
  },

  {
    id: "task-003",

    userId: "ramesh-001",

    title: "Water the plants",

    time: "17:00",

    period: "Evening",

    completed: false
  },

  {
    id: "task-004",

    userId: "ramesh-001",

    title: "Walk for 15 minutes",

    time: "17:30",

    period: "Evening",

    completed: false
  }

];