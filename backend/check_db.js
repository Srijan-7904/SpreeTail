import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function alterDb() {
  const db = await open({ filename: 'database.sqlite', driver: sqlite3.Database });
  try {
    await db.exec("ALTER TABLE expenses ADD COLUMN category TEXT DEFAULT 'General'");
    console.log("Column added!");
  } catch (err) {
    console.error(err.message);
  }
}
alterDb();
