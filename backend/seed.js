import dbPromise, { initDb } from './db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const db = await initDb();

  // Check if seeded
  const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (usersCount.count > 0) {
    console.log('Database already seeded or has data. Skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);
  const users = ['Aisha', 'Rohan', 'Priya', 'Meera', 'Dev', 'Sam'];
  const userIds = {};

  // Insert Users
  for (const name of users) {
    const email = `${name.toLowerCase()}@example.com`;
    const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?) RETURNING id', [name, email, passwordHash]);
    userIds[name] = result.lastID;
  }

  // Insert Group
  const groupRes = await db.run("INSERT INTO groups (name) VALUES ('Flatmates 2026') RETURNING id");
  const groupId = groupRes.lastID;

  // Insert Group Members with their tenancies
  // Initial group: Aisha, Rohan, Priya, Meera (from Jan 2026)
  // Dev visited for weekend (not a permanent member, but we can add him with a short tenancy or just as a non-group user involved in some splits)
  // Meera left end of March 2026.
  // Sam joined mid-April 2026.
  
  const members = [
    { name: 'Aisha', joined_at: '2026-01-01', left_at: null },
    { name: 'Rohan', joined_at: '2026-01-01', left_at: null },
    { name: 'Priya', joined_at: '2026-01-01', left_at: null },
    { name: 'Meera', joined_at: '2026-01-01', left_at: '2026-03-31' },
    { name: 'Dev', joined_at: '2026-02-08', left_at: '2026-03-15' }, // Temporary for trip/weekend
    { name: 'Sam', joined_at: '2026-04-10', left_at: null }
  ];

  for (const m of members) {
    await db.run(
      'INSERT INTO group_members (group_id, user_id, joined_at, left_at) VALUES (?, ?, ?, ?)',
      [groupId, userIds[m.name], m.joined_at, m.left_at]
    );
  }

  console.log('Database seeded successfully!');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
