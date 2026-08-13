// db.js
// Data layer with two backends:
//  - Vercel KV (Redis) when KV_REST_API_URL / KV_REST_API_TOKEN env vars are present
//    (this is how it runs in production on Vercel)
//  - A local JSON file when those env vars are absent
//    (this is how it runs when you do `npm start` on your own machine)
//
// Kept as one small module so the rest of the app doesn't care which backend is active.

// Vercel's Marketplace Redis integration (Upstash) injects either of these
// env var pairs depending on how it was connected — support both.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useKV = !!(REDIS_URL && REDIS_TOKEN);

let store; // object with async get(key) / set(key, value)

if (useKV) {
  const { Redis } = require("@upstash/redis");
  const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  store = {
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value)
  };
} else {
  const fs = require("fs");
  const path = require("path");
  const DATA_DIR = path.join(__dirname, "data");
  const FILE = path.join(DATA_DIR, "store.json");

  function loadFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  }
  function saveFile(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  }

  store = {
    async get(key) {
      const data = loadFile();
      return key in data ? data[key] : null;
    },
    async set(key, value) {
      const data = loadFile();
      data[key] = value;
      saveFile(data);
      return "OK";
    }
  };
}

const SEED_NOTICES = [
  {
    id: 1,
    title: "Welcome to the New Semester",
    content:
      "Classes for the new semester begin on Monday. Please collect your updated timetable from the department office.",
    category: "General",
    priority: "normal",
    postedBy: "Admin",
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Mid-Semester Exam Schedule Released",
    content:
      "The mid-semester examination schedule has been published on the college website. Check your respective department page for exact dates.",
    category: "Exam",
    priority: "urgent",
    postedBy: "Admin",
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: "Annual Tech Fest - Registrations Open",
    content:
      "Registrations for the annual tech fest are now open. Visit the student council desk to register your team.",
    category: "Event",
    priority: "normal",
    postedBy: "Admin",
    createdAt: new Date().toISOString()
  }
];

let seedPromise = null;
async function ensureSeed() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const notices = await store.get("notices");
      if (!notices) await store.set("notices", SEED_NOTICES);

      const admin = await store.get("admin");
      if (!admin) {
        // Plain-text credentials, kept intentionally simple for this project.
        // Change these directly here (and re-seed) if you want different ones.
        await store.set("admin", {
          username: "admin",
          password: "admin123"
        });
      }
    })();
  }
  return seedPromise;
}

async function readNotices() {
  await ensureSeed();
  return (await store.get("notices")) || [];
}

async function writeNotices(notices) {
  await store.set("notices", notices);
}

async function getAdmin() {
  await ensureSeed();
  return await store.get("admin");
}

function nextId(notices) {
  return notices.length ? Math.max(...notices.map((n) => n.id)) + 1 : 1;
}

module.exports = { readNotices, writeNotices, getAdmin, nextId, usingKV: useKV };
// (usingKV really means "using Upstash Redis via Vercel", kept the name for brevity)
