import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");
let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db) return _db;
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
  _db = new DatabaseSync(path.join(DATA, "app.db"));
  _db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pass TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions(
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS answers(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      qid TEXT NOT NULL,
      correct INTEGER NOT NULL,
      mode TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_answers_user_q ON answers(user_id, qid);
    CREATE TABLE IF NOT EXISTS favorites(
      user_id INTEGER NOT NULL,
      qid TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, qid)
    );
    CREATE TABLE IF NOT EXISTS exams(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bank TEXT NOT NULL,
      correct INTEGER NOT NULL,
      total INTEGER NOT NULL,
      score INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      detail TEXT NOT NULL
    );
  `);
  return _db;
}
