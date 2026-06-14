import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log('Using database at:', dbPath);

const dbPromise = open({
  filename: dbPath,
  driver: sqlite3.Database
});

export const initDb = async () => {
  const db = await dbPromise;

    // Clean DB setup (tables will not be dropped on restart)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATE,
      left_at DATE,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        paid_by_user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        description TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        date TEXT NOT NULL,
        split_type TEXT NOT NULL,
        notes TEXT,
        is_settlement INTEGER DEFAULT 0,
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(paid_by_user_id) REFERENCES users(id)
      );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_owed REAL,
      share INTEGER,
      percentage REAL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS anomalies_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER,
      original_row_data TEXT,
      issue_type TEXT,
      resolution TEXT,
      is_approved BOOLEAN DEFAULT 0
    );
  `);

  return db;
};

export default dbPromise;
