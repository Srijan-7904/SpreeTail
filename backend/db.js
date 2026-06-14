import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isPostgres = !!process.env.DATABASE_URL;

// Fix for Postgres returning decimals as strings
if (isPostgres) {
  pg.types.setTypeParser(1700, parseFloat);
}

// Helper to convert `?` to `$1, $2` for Postgres
function toPgParams(sql) {
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
}

class UniversalDB {
  constructor() {
    this.engine = isPostgres ? 'postgres' : 'sqlite';
    if (this.engine === 'postgres') {
      console.log('Using PostgreSQL database');
      this.client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Render Postgres
      });
      this.client.connect();
    } else {
      const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
      console.log('Using SQLite database at:', dbPath);
      this.sqlitePromise = (async () => {
        const sqlite3 = (await import('sqlite3')).default;
        const { open } = await import('sqlite');
        return open({
          filename: dbPath,
          driver: sqlite3.Database
        });
      })();
    }
  }

  async exec(sql) {
    if (this.engine === 'postgres') {
      await this.client.query(sql);
    } else {
      const db = await this.sqlitePromise;
      await db.exec(sql);
    }
  }

  async run(sql, params = []) {
    if (this.engine === 'postgres') {
      const res = await this.client.query(toPgParams(sql), params);
      // If it's an INSERT returning id, abstract it into lastID
      let lastID = 0;
      if (res.rows && res.rows.length > 0 && res.rows[0].id) {
        lastID = res.rows[0].id;
      }
      return { lastID, changes: res.rowCount };
    } else {
      const db = await this.sqlitePromise;
      const res = await db.run(sql, params);
      // If it's returning id, let's also support fetching it manually if the wrapper missed it.
      // SQLite run() sets res.lastID.
      return res;
    }
  }

  async all(sql, params = []) {
    if (this.engine === 'postgres') {
      const res = await this.client.query(toPgParams(sql), params);
      return res.rows;
    } else {
      const db = await this.sqlitePromise;
      return await db.all(sql, params);
    }
  }

  async get(sql, params = []) {
    if (this.engine === 'postgres') {
      const res = await this.client.query(toPgParams(sql), params);
      return res.rows[0];
    } else {
      const db = await this.sqlitePromise;
      return await db.get(sql, params);
    }
  }
}

const db = new UniversalDB();

export const initDb = async () => {
  const isPg = db.engine === 'postgres';
  const autoinc = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id ${autoinc},
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id ${autoinc},
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id ${autoinc},
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATE,
      left_at DATE,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id ${autoinc},
      group_id INTEGER NOT NULL,
      paid_by_user_id INTEGER NOT NULL,
      amount ${isPg ? 'DECIMAL' : 'REAL'} NOT NULL,
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
      id ${autoinc},
      expense_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_owed ${isPg ? 'DECIMAL' : 'REAL'},
      share INTEGER,
      percentage ${isPg ? 'DECIMAL' : 'REAL'},
      FOREIGN KEY (expense_id) REFERENCES expenses(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS anomalies_log (
      id ${autoinc},
      expense_id INTEGER,
      original_row_data TEXT,
      issue_type TEXT,
      resolution TEXT,
      is_approved ${isPg ? 'BOOLEAN' : 'INTEGER'} DEFAULT ${isPg ? 'false' : '0'}
    );
  `);

  return db;
};

// Export the instance as a promise to match the old signature `await dbPromise`
// but since it's already an object with async methods, we can just export it directly.
// In `index.js`, we have `const db = await dbPromise;`
// We will export a promise that resolves to the universal `db` object.
const dbPromise = Promise.resolve(db);
export default dbPromise;
