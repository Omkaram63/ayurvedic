import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const databasePath = process.env.DATABASE_PATH || (process.env.VERCEL ? path.join("/tmp", "database.db") : path.join(dataDir, "database.db"));

if (!process.env.DATABASE_PATH && !process.env.VERCEL) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patient_name TEXT,
    patient_identifier TEXT,
    symptoms TEXT NOT NULL,
    disease TEXT NOT NULL,
    confidence REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const predictionColumns = db.prepare("PRAGMA table_info(predictions)").all();
const predictionColumnNames = new Set(predictionColumns.map((column) => column.name));

if (!predictionColumnNames.has("patient_name")) {
  db.exec("ALTER TABLE predictions ADD COLUMN patient_name TEXT");
}

if (!predictionColumnNames.has("patient_identifier")) {
  db.exec("ALTER TABLE predictions ADD COLUMN patient_identifier TEXT");
}

export default db;
