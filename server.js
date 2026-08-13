// server.js
// Express app for the College Notice Board Announcement System.
// Auth is a signed JWT stored in an httpOnly cookie (stateless — works fine
// on serverless platforms like Vercel, unlike in-memory sessions).

const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const isProd = process.env.NODE_ENV === "production";

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Auth helpers ----------
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please log in again" });
  }
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  maxAge: 1000 * 60 * 60 * 4 // 4 hours
};

// ---------- Auth routes ----------
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const admin = await db.getAdmin();
  if (username !== admin.username || password !== admin.password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "4h" });
  res.cookie("token", token, COOKIE_OPTS);
  res.json({ message: "Logged in successfully", username });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTS, maxAge: undefined });
  res.json({ message: "Logged out" });
});

app.get("/api/session", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ isAdmin: false });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json({ isAdmin: true, username: data.username });
  } catch {
    res.json({ isAdmin: false });
  }
});

// ---------- Notice routes ----------

app.get("/api/notices", async (req, res) => {
  let notices = await db.readNotices();
  const { category, q, priority } = req.query;

  if (category && category !== "All") notices = notices.filter((n) => n.category === category);
  if (priority && priority !== "All") notices = notices.filter((n) => n.priority === priority);
  if (q) {
    const term = String(q).toLowerCase();
    notices = notices.filter(
      (n) => n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term)
    );
  }

  notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(notices);
});

app.get("/api/notices/:id", async (req, res) => {
  const notices = await db.readNotices();
  const notice = notices.find((n) => n.id === Number(req.params.id));
  if (!notice) return res.status(404).json({ error: "Notice not found" });
  res.json(notice);
});

app.post("/api/notices", requireAuth, async (req, res) => {
  const { title, content, category, priority } = req.body || {};
  if (!title || !content || !category) {
    return res.status(400).json({ error: "Title, content and category are required" });
  }

  const notices = await db.readNotices();
  const newNotice = {
    id: db.nextId(notices),
    title: title.trim(),
    content: content.trim(),
    category,
    priority: priority === "urgent" ? "urgent" : "normal",
    postedBy: req.admin.username,
    createdAt: new Date().toISOString()
  };

  notices.push(newNotice);
  await db.writeNotices(notices);
  res.status(201).json(newNotice);
});

app.put("/api/notices/:id", requireAuth, async (req, res) => {
  const notices = await db.readNotices();
  const idx = notices.findIndex((n) => n.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Notice not found" });

  const { title, content, category, priority } = req.body || {};
  if (title) notices[idx].title = title.trim();
  if (content) notices[idx].content = content.trim();
  if (category) notices[idx].category = category;
  if (priority) notices[idx].priority = priority === "urgent" ? "urgent" : "normal";
  notices[idx].updatedAt = new Date().toISOString();

  await db.writeNotices(notices);
  res.json(notices[idx]);
});

app.delete("/api/notices/:id", requireAuth, async (req, res) => {
  let notices = await db.readNotices();
  const exists = notices.some((n) => n.id === Number(req.params.id));
  if (!exists) return res.status(404).json({ error: "Notice not found" });

  notices = notices.filter((n) => n.id !== Number(req.params.id));
  await db.writeNotices(notices);
  res.json({ message: "Notice deleted" });
});

// Only start a listener when run directly (local dev).
// On Vercel, api/index.js imports `app` and Vercel handles the listening.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Notice Board app running at http://localhost:${PORT}`);
    console.log(`Storage backend: ${db.usingKV ? "Vercel KV" : "local JSON file"}`);
  });
}

module.exports = app;
