import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import dbPromise from './db.js';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

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
  const { resolvedData, anomalies } = req.body;
  
  if (!resolvedData || !Array.isArray(resolvedData)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  try {
    const db = await dbPromise;
    await db.exec('BEGIN TRANSACTION');

    const groupId = 1; // Default Flatmates group for this assignment

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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

app.get('/api/users', async (req, res) => {
  try {
    const db = await dbPromise;
    const users = await db.all('SELECT id, name FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const db = await dbPromise;
    const expenses = await db.all(`
      SELECT e.id, e.amount, e.currency, e.description, e.date, e.split_type, e.is_settlement, u.name as paid_by
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
      ORDER BY e.date DESC, e.id DESC
    `);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/balances', async (req, res) => {
  try {
    const db = await dbPromise;
    // Get all expenses and their splits
    const expenses = await db.all(`
      SELECT e.id, e.paid_by_user_id, e.amount, e.currency, e.is_settlement, e.date, e.description,
             u.name as paid_by_name
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
    `);

    const splits = await db.all(`
      SELECT s.expense_id, s.user_id, s.amount_owed, u.name as owe_name
      FROM expense_splits s
      JOIN users u ON s.user_id = u.id
    `);

    // We will compute balances per currency
    const balances = {}; // { [currency]: { [userId]: balance } }
    
    // Initialize users
    const users = await db.all('SELECT id, name FROM users');
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

// Start server
const startServer = async () => {
  await initDb();
  console.log('Database initialized');
  
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer();

import { processCSV } from './importEngine.js';

// --- Import Engine Logic ---
async function generatePreview(rawData) {
  const db = await dbPromise;
  const users = await db.all('SELECT * FROM users');
  const userMap = new Map(users.map(u => [u.name.toLowerCase(), u.id]));

  return processCSV(rawData, userMap);
}
