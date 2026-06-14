import express from 'express';
import cors from 'cors';
import dbPromise, { initDb } from './db.js';
import { processCSV } from './importEngine.js';
import { requireAuth, generateToken } from './auth.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import seed from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const db = await dbPromise;
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?) RETURNING id', [name, email, hashed]);
    
    const token = generateToken(result.lastID);
    res.json({ token, user: { id: result.lastID, name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const db = await dbPromise;
    const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GROUP MANAGEMENT ROUTES ---

app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    const db = await dbPromise;
    const groups = await db.all(`
      SELECT g.id, g.name, gm.joined_at, gm.left_at 
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `, [req.user.id]);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const db = await dbPromise;
    await db.exec('BEGIN TRANSACTION');
    
    const gRes = await db.run('INSERT INTO groups (name) VALUES (?) RETURNING id', [name]);
    const groupId = gRes.lastID;
    
    await db.run('INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)', 
      [groupId, req.user.id, new Date().toISOString().split('T')[0]]);
      
    await db.exec('COMMIT');
    res.json({ id: groupId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/groups/:groupId/members', requireAuth, async (req, res) => {
  try {
    const db = await dbPromise;
    const members = await db.all(`
      SELECT u.id, u.name, u.email, gm.joined_at, gm.left_at 
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `, [req.params.groupId]);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups/:groupId/members', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const db = await dbPromise;
    const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.run('INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)', 
      [req.params.groupId, user.id, new Date().toISOString().split('T')[0]]);
      
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import endpoints
app.post('/api/expenses/import/preview', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const filePath = path.join(__dirname, req.file.path);

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      fs.unlinkSync(filePath); // Clean up
      
      try {
        const previewData = await generatePreview(results);
        res.json(previewData);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });
});

app.post('/api/expenses/import/confirm', async (req, res) => {
  const { resolvedData, anomalies, groupId } = req.body;
  
  if (!resolvedData || !Array.isArray(resolvedData) || !groupId) {
    return res.status(400).json({ error: 'Invalid data format or missing groupId' });
  }

  try {
    const db = await dbPromise;
    await db.exec('BEGIN TRANSACTION');

    // Insert anomalies log
    if (anomalies && anomalies.length > 0) {
      for (const anomaly of anomalies) {
        await db.run(
          'INSERT INTO anomalies_log (original_row_data, issue_type, resolution, is_approved) VALUES (?, ?, ?, ?)',
          [anomaly.originalRowData, anomaly.issueType, anomaly.resolution, anomaly.isApproved ? 1 : 0]
        );
      }
    }

    // Insert processed expenses
    for (const expense of resolvedData) {
      if (expense.shouldSkip) continue; // In case user rejected

      const expRes = await db.run(
        `INSERT INTO expenses (group_id, paid_by_user_id, amount, currency, description, date, split_type, notes, is_settlement)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          groupId,
          expense.paid_by_user_id,
          expense.amount,
          expense.currency,
          expense.description,
          expense.date,
          expense.split_type,
          expense.notes,
          expense.is_settlement ? 1 : 0
        ]
      );
      
      const expenseId = expRes.lastID;

      // Compute split amounts
      const splitUsersCount = expense.splitUsers.length;
      let splitsToInsert = [];

      if (expense.is_settlement) {
        // Settlement: payer pays payee. Payee is in splitUsers.
        if (splitUsersCount > 0) {
          splitsToInsert = [{
            user_id: expense.splitUsers[0].userId,
            amount_owed: expense.amount
          }];
        }
      } else {
        if (expense.split_type === 'equal' && splitUsersCount > 0) {
          const splitAmount = expense.amount / splitUsersCount;
          splitsToInsert = expense.splitUsers.map(u => ({
            user_id: u.userId,
            amount_owed: splitAmount
          }));
        } else if (expense.split_type === 'percentage') {
          splitsToInsert = expense.parsedSplits.map(s => ({
            user_id: s.userId,
            percentage: s.percentage,
            amount_owed: (s.percentage / 100) * expense.amount
          }));
        } else if (expense.split_type === 'unequal') {
          splitsToInsert = expense.parsedSplits.map(s => ({
            user_id: s.userId,
            amount_owed: s.amount_owed
          }));
        } else if (expense.split_type === 'share') {
          const totalShares = expense.parsedSplits.reduce((acc, s) => acc + s.share, 0);
          splitsToInsert = expense.parsedSplits.map(s => ({
            user_id: s.userId,
            share: s.share,
            amount_owed: (s.share / totalShares) * expense.amount
          }));
        }

        // Default to equal if parsedSplits failed but users exist
        if (splitsToInsert.length === 0 && splitUsersCount > 0) {
          const splitAmount = expense.amount / splitUsersCount;
          splitsToInsert = expense.splitUsers.map(u => ({
            user_id: u.userId,
            amount_owed: splitAmount
          }));
        }
      }

      for (const split of splitsToInsert) {
        await db.run(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed, share, percentage)
           VALUES (?, ?, ?, ?, ?)`,
          [expenseId, split.user_id, split.amount_owed, split.share || null, split.percentage || null]
        );
      }
    }

    await db.exec('COMMIT');
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (err) {
    await (await dbPromise).exec('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const db = await dbPromise;
    const users = await db.all('SELECT id, name, email FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10', [`%${q}%`, `%${q}%`]);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expenses', requireAuth, async (req, res) => {
  try {
    const groupId = req.query.groupId;
    if (!groupId) return res.status(400).json({ error: 'groupId is required' });

    const db = await dbPromise;
    const expenses = await db.all(`
      SELECT e.id, e.amount, e.currency, e.description, e.category, e.date, e.split_type, e.is_settlement, u.name as paid_by
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE e.group_id = ?
      ORDER BY e.date DESC, e.id DESC
    `, [groupId]);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/balances', requireAuth, async (req, res) => {
// ... skipped updating balances as category isn't needed there right now ...

  try {
    const groupId = req.query.groupId;
    if (!groupId) return res.status(400).json({ error: 'groupId is required' });

    const db = await dbPromise;
    // Get all expenses and their splits
    const expenses = await db.all(`
      SELECT e.id, e.paid_by_user_id, e.amount, e.currency, e.is_settlement, e.date, e.description,
             u.name as paid_by_name
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE e.group_id = ?
    `, [groupId]);

    const splits = await db.all(`
      SELECT s.expense_id, s.user_id, s.amount_owed, u.name as owe_name
      FROM expense_splits s
      JOIN users u ON s.user_id = u.id
      JOIN expenses e ON s.expense_id = e.id
      WHERE e.group_id = ?
    `, [groupId]);

    // We will compute balances per currency
    const balances = {}; // { [currency]: { [userId]: balance } }
    
    // Initialize users
    const users = await db.all(`
      SELECT u.id, u.name 
      FROM users u 
      JOIN group_members gm ON u.id = gm.user_id 
      WHERE gm.group_id = ?
    `, [groupId]);
    users.forEach(u => {
      balances['INR'] = balances['INR'] || {};
      balances['INR'][u.id] = 0;
      balances['USD'] = balances['USD'] || {};
      balances['USD'][u.id] = 0;
    });

    expenses.forEach(exp => {
      const cur = exp.currency || 'INR';
      if (!balances[cur]) balances[cur] = {};
      if (!balances[cur][exp.paid_by_user_id]) balances[cur][exp.paid_by_user_id] = 0;
      
      // Paid by user gets + amount
      balances[cur][exp.paid_by_user_id] += exp.amount;
      
      // Find splits for this expense
      const expSplits = splits.filter(s => s.expense_id === exp.id);
      expSplits.forEach(split => {
        if (!balances[cur][split.user_id]) balances[cur][split.user_id] = 0;
        balances[cur][split.user_id] -= split.amount_owed;
      });
    });

    // Also we will provide total spent per person
    res.json({ balances, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/balances/details/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const db = await dbPromise;

    // What this user paid for (others owe them)
    const paidByMe = await db.all(`
      SELECT e.id, e.amount, e.currency, e.description, e.date, e.is_settlement, s.user_id as owes_id, s.amount_owed, u.name as owes_name
      FROM expenses e
      JOIN expense_splits s ON e.id = s.expense_id
      JOIN users u ON s.user_id = u.id
      WHERE e.paid_by_user_id = ? AND s.user_id != ?
    `, [userId, userId]);

    // What this user owes others (they paid)
    const iOwe = await db.all(`
      SELECT e.id, e.amount as total_amount, e.currency, e.description, e.date, e.is_settlement, e.paid_by_user_id, u.name as paid_by_name, s.amount_owed
      FROM expenses e
      JOIN expense_splits s ON e.id = s.expense_id
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE s.user_id = ? AND e.paid_by_user_id != ?
    `, [userId, userId]);

    res.json({ paidByMe, iOwe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { groupId, paid_by_user_id, amount, currency, description, category, split_type, date, splitUsers } = req.body;
  
  if (!groupId || !paid_by_user_id || !amount || !description || !splitUsers || splitUsers.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = await dbPromise;
    await db.exec('BEGIN TRANSACTION');

    const expRes = await db.run(
      `INSERT INTO expenses (group_id, paid_by_user_id, amount, currency, description, category, date, split_type, is_settlement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [groupId, paid_by_user_id, amount, currency || 'INR', description, category || 'General', date || new Date().toISOString().split('T')[0], split_type, split_type === 'settlement' ? 1 : 0]
    );

    const expenseId = expRes.lastID;
    
    // Simple equal split handling for manual entries or settlement
    if (split_type === 'settlement') {
        // payee is the only one in splitUsers
        await db.run(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES (?, ?, ?)`,
          [expenseId, splitUsers[0], amount]
        );
    } else if (split_type === 'equal') {
      const splitAmt = amount / splitUsers.length;
      for (const uId of splitUsers) {
        await db.run(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES (?, ?, ?)`,
          [expenseId, uId, splitAmt]
        );
      }
    }

    await db.exec('COMMIT');
    res.json({ success: true, message: 'Expense added' });
  } catch (err) {
    await (await dbPromise).exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// --- Import Engine Logic ---
async function generatePreview(rawData) {
  const db = await dbPromise;
  const users = await db.all('SELECT * FROM users');
  const userMap = new Map(users.map(u => [u.name.toLowerCase(), u.id]));

  return processCSV(rawData, userMap);
}

// Serve React Frontend in Production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server
const startServer = async () => {
  await initDb();
  console.log('Database initialized');
  
  await seed();
  
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer();
