import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import bcrypt from "bcryptjs";
import db from "./db.js";
import { getDiseaseSymptoms, getSymptoms, predictDiseases } from "./predictor.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SESSION_SECRET = process.env.SESSION_SECRET || "ayur-predict-secret";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.created_at,
  };
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/auth/session", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters long." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "That username already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  req.session.user = sanitizeUser(user);
  return res.status(201).json({ user: req.session.user });
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  req.session.user = sanitizeUser(user);
  return res.json({ user: req.session.user });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.get("/api/symptoms", requireAuth, (_req, res) => {
  res.json({ symptoms: getSymptoms() });
});

app.post("/api/predict", requireAuth, (req, res) => {
  const symptoms = Array.isArray(req.body.symptoms) ? req.body.symptoms : [];
  const patientName = String(req.body.patient?.patientName || "").trim();
  const patientIdentifier = String(req.body.patient?.patientId || "").trim();

  if (!symptoms.length) {
    return res.status(400).json({ error: "Select at least one symptom." });
  }
  if (!patientName || !patientIdentifier) {
    return res.status(400).json({ error: "Patient name and patient ID are required." });
  }

  const matches = predictDiseases(symptoms);
  if (!matches.length) {
    return res.status(400).json({ error: "No known symptoms detected." });
  }

  const topMatch = matches[0];
  const userId = req.session.user.id;
  const symptomsText = symptoms.join(", ");
  const confidence = topMatch.confidenceRaw / 100;

  db.prepare(
    "INSERT INTO predictions (user_id, patient_name, patient_identifier, symptoms, disease, confidence) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(userId, patientName, patientIdentifier, symptomsText, topMatch.disease, confidence);

  return res.json({
    disease: topMatch.disease,
    confidence: topMatch.confidence,
    confidenceRaw: topMatch.confidenceRaw,
    matches,
    graph: {
      disease: topMatch.disease,
      symptoms: getDiseaseSymptoms(topMatch.disease),
    },
    selectedSymptoms: symptoms,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/history", requireAuth, (req, res) => {
  const records = db
    .prepare(
      "SELECT id, patient_name, patient_identifier, disease, confidence, timestamp FROM predictions WHERE user_id = ? ORDER BY timestamp DESC, id DESC LIMIT 50",
    )
    .all(req.session.user.id)
    .map((record) => ({
      ...record,
      confidencePct: Number((record.confidence * 100).toFixed(1)),
    }));

  res.json({ records });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`AyurPredict backend running on http://localhost:${PORT}`);
  });
}