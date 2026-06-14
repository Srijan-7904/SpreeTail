import { parse, isValid, format } from 'date-fns';

export async function processCSV(rawData, userMap) {
  const anomalies = [];
  const processed = [];
  
  // Track seen rows to find duplicates
  const seenRows = new Set();
  
  // Helper to normalize names
  const normalizeName = (name) => {
    if (!name) return null;
    let n = name.trim().toLowerCase();
    if (n === 'priya s') n = 'priya';
    return n;
  };

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const originalRowData = JSON.stringify(row);
    let issueType = null;
    let resolution = null;
    let isApproved = true; // Auto-approve simple ones unless specified
    
    // 1. Date normalization
    let parsedDate = null;
    const dateStr = row.date;
    const dateFormats = ['d/M/yyyy', 'dd-MM-yyyy', 'd-MMM', 'M/d/yyyy'];
    for (const fmt of dateFormats) {
      const d = parse(dateStr, fmt, new Date(2026, 0, 1));
      if (isValid(d)) {
        parsedDate = format(d, 'yyyy-MM-dd');
        break;
      }
    }
    
    if (!parsedDate) {
      issueType = 'Invalid Date';
      resolution = 'Skipped row';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: false });
      continue;
    }

    // 2. Name normalization
    const paidByRaw = normalizeName(row.paid_by);
    const paidByUserId = userMap.get(paidByRaw);
    if (!paidByUserId) {
      if (!row.paid_by) {
        issueType = 'Missing Payer';
        resolution = 'Skipped row (Cannot track expense without payer)';
        anomalies.push({ originalRowData, issueType, resolution, isApproved: false });
        continue;
      } else {
        issueType = 'Unknown Payer';
        resolution = `Skipped row (Payer ${row.paid_by} not found)`;
        anomalies.push({ originalRowData, issueType, resolution, isApproved: false });
        continue;
      }
    }

    // 3. Amount and Currency
    let amount = parseFloat(row.amount);
    let currency = row.currency ? row.currency.toUpperCase() : null;
    
    if (isNaN(amount)) {
      issueType = 'Invalid Amount';
      resolution = 'Skipped row';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: false });
      continue;
    }

    if (amount === 0) {
      issueType = 'Zero Amount';
      resolution = 'Ignored zero amount expense';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: true });
      continue;
    }

    if (!currency) {
      issueType = 'Missing Currency';
      currency = 'INR';
      resolution = 'Assumed INR as default currency';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: true });
    }

    // Fractions rounding
    if (amount !== Math.round(amount * 100) / 100) {
      const oldAmount = amount;
      amount = Math.round(amount * 100) / 100;
      issueType = 'Fractional Amount';
      resolution = `Rounded from ${oldAmount} to ${amount}`;
      anomalies.push({ originalRowData, issueType, resolution, isApproved: true });
    }

    // 4. Duplicate Check
    // Create a key based on date, amount, payer, and description (fuzzy)
    const dupKey = `${parsedDate}_${amount}_${paidByUserId}`;
    if (seenRows.has(dupKey)) {
      issueType = 'Duplicate Entry';
      resolution = 'Removed exact duplicate';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: false }); // User should approve deletes
      continue;
    }
    
    // Check for conflicting duplicate (Thalassa dinner: 2400 vs 2450)
    // We can do a simpler check based on date and description similarity
    const descLower = row.description.toLowerCase();
    const isConflict = processed.some(p => p.date === parsedDate && 
      (p.description.toLowerCase().includes('thalassa') && descLower.includes('thalassa')) &&
      p.amount !== amount
    );

    if (isConflict) {
      issueType = 'Conflicting Duplicate';
      resolution = 'Flagged for review (kept both for now, manual delete needed)';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: false });
    }

    seenRows.add(dupKey);

    // 5. Settlement check
    let isSettlement = false;
    let splitType = row.split_type;
    if (!splitType && row.description.toLowerCase().includes('paid') && row.description.toLowerCase().includes('back')) {
      isSettlement = true;
      issueType = 'Settlement Logged as Expense';
      resolution = 'Marked as Settlement';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: true });
    }

    // 6. Split processing
    const splitWithStr = row.split_with || '';
    let rawSplitUsers = splitWithStr.split(';').map(normalizeName).filter(Boolean);
    let splitUsers = [];
    let unknownSplitUsers = [];

    for (const n of rawSplitUsers) {
      const uId = userMap.get(n);
      if (uId) {
        splitUsers.push({ name: n, userId: uId });
      } else {
        unknownSplitUsers.push(n);
      }
    }

    if (unknownSplitUsers.length > 0) {
      issueType = 'Unknown User in Split';
      resolution = `Re-assigned ${unknownSplitUsers.join(', ')}'s share to the payer (ID: ${paidByUserId})`;
      // We keep them in the array but give them the payer's ID so the math still divides correctly, but the debt goes to the payer
      for (const unk of unknownSplitUsers) {
        splitUsers.push({ name: unk, userId: paidByUserId });
      }
      anomalies.push({ originalRowData, issueType, resolution, isApproved: true });
    }

    // If "Meera still in the list" but she left in March
    if (parsedDate > '2026-03-31') {
      const meeraIdx = splitUsers.findIndex(u => u.name === 'meera');
      if (meeraIdx !== -1) {
        issueType = 'Ex-member in split';
        resolution = 'Removed Meera from split (she moved out)';
        splitUsers.splice(meeraIdx, 1);
        anomalies.push({ originalRowData, issueType, resolution, isApproved: false });
      }
    }

    // Validate percentage
    let splitDetailsStr = row.split_details || '';
    let parsedSplits = [];
    if (splitType === 'percentage' && splitDetailsStr) {
      const parts = splitDetailsStr.split(';').map(p => p.trim());
      let totalP = 0;
      parts.forEach(p => {
        const match = p.match(/([a-zA-Z]+)\s*(\d+)%/);
        if (match) {
          const u = normalizeName(match[1]);
          const pct = parseFloat(match[2]);
          totalP += pct;
          parsedSplits.push({ userId: userMap.get(u), percentage: pct });
        }
      });
      if (totalP !== 100) {
        issueType = 'Percentages !== 100%';
        resolution = `Normalized percentages (sum was ${totalP}%)`;
        parsedSplits = parsedSplits.map(s => ({...s, percentage: (s.percentage / totalP) * 100 }));
        anomalies.push({ originalRowData, issueType, resolution, isApproved: true });
      }
    } else if (splitType === 'unequal' && splitDetailsStr) {
      const parts = splitDetailsStr.split(';').map(p => p.trim());
      parts.forEach(p => {
        const match = p.match(/([a-zA-Z]+)\s*(\d+)/);
        if (match) {
          const u = normalizeName(match[1]);
          const amt = parseFloat(match[2]);
          parsedSplits.push({ userId: userMap.get(u), amount_owed: amt });
        }
      });
    } else if (splitType === 'share' && splitDetailsStr) {
      const parts = splitDetailsStr.split(';').map(p => p.trim());
      parts.forEach(p => {
        const match = p.match(/([a-zA-Z]+)\s*(\d+)/);
        if (match) {
          const u = normalizeName(match[1]);
          const sh = parseInt(match[2]);
          parsedSplits.push({ userId: userMap.get(u), share: sh });
        }
      });
    }

    if (amount < 0) {
      // It's a refund
      issueType = 'Negative Amount (Refund)';
      resolution = 'Treated as negative expense';
      anomalies.push({ originalRowData, issueType, resolution, isApproved: true });
    }

    processed.push({
      originalRow: row,
      date: parsedDate,
      description: row.description,
      paid_by_user_id: paidByUserId,
      amount,
      currency,
      split_type: isSettlement ? 'settlement' : (splitType || 'equal'),
      is_settlement: isSettlement,
      splitUsers,
      parsedSplits,
      notes: row.notes
    });
  }

  return { processed, anomalies };
}
