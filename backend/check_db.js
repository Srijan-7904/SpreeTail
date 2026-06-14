import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkDb() {
  const db = await open({ filename: 'database.sqlite', driver: sqlite3.Database });
  const users = await db.all('SELECT id, name, email, password FROM users');
  console.log(users);
}
checkDb();
