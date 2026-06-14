import dbPromise, { initDb } from './db.js';

async function seed() {
  const db = await initDb();

  // Clear existing data
  await db.exec('DELETE FROM anomalies_log');
  await db.exec('DELETE FROM expense_splits');
  await db.exec('DELETE FROM expenses');
  await db.exec('DELETE FROM group_members');
  await db.exec('DELETE FROM groups');
  await db.exec('DELETE FROM users');

  // Insert Users
  const users = ['Aisha', 'Rohan', 'Priya', 'Meera', 'Dev', 'Sam'];
  const userIds = {};

  for (const name of users) {
    const result = await db.run('INSERT INTO users (name) VALUES (?)', [name]);
    userIds[name] = result.lastID;
  }

  // Insert Group
  const groupRes = await db.run("INSERT INTO groups (name) VALUES ('Flatmates')");
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
