# SCOPE: Data Anomalies & Database Schema

## Anomaly Log
During the CSV data ingestion process (managed by `backend/importEngine.js`), the application scans incoming rows for data integrity issues. Below is a log of the anomalies detected and how they are handled:

1. **Negative Expenses:**
   - *Problem:* Users occasionally upload CSVs containing negative values for expenses, which breaks the ledger math.
   - *Handling:* The engine detects any `amount < 0`. The anomaly is flagged with `issue_type: 'NEGATIVE_AMOUNT'` and the value is converted to its absolute positive equivalent (`Math.abs(amount)`).
   
2. **Missing Users / Typos:**
   - *Problem:* A CSV might mention a user who doesn't have an account or is misspelled.
   - *Handling:* The engine detects unknown names. It flags it as `issue_type: 'UNKNOWN_USER'` and automatically generates a placeholder account using a standard email pattern (`name@example.com`).

3. **Mathematical Mismatches (Splits):**
   - *Problem:* For `exact` split types, the sum of all individual splits in the CSV might not equal the total expense amount.
   - *Handling:* The engine sums the splits. If they do not match the total, it logs `issue_type: 'MATH_MISMATCH'` and automatically adjusts the largest split fraction to absorb the difference (cents rounding) so the ledger perfectly balances.

All anomalies are actively recorded in the `anomalies_log` database table for user review.

---

## Database Schema
The application uses a Dual-Engine architecture (SQLite for local, PostgreSQL for production).

### `users`
- `id`: Primary Key (Serial/AutoIncrement)
- `name`: Text (Not Null)
- `email`: Text (Unique, Not Null)
- `password`: Text (Hashed, Not Null)

### `groups`
- `id`: Primary Key
- `name`: Text (Not Null)

### `group_members`
- `id`: Primary Key
- `group_id`: Foreign Key (`groups.id`)
- `user_id`: Foreign Key (`users.id`)
- `joined_at`: Date
- `left_at`: Date (Nullable)

### `expenses`
- `id`: Primary Key
- `group_id`: Foreign Key (`groups.id`)
- `paid_by_user_id`: Foreign Key (`users.id`)
- `amount`: Decimal/Real (Not Null)
- `currency`: Text (Default 'INR')
- `description`: Text
- `category`: Text (Default 'General')
- `date`: Text
- `split_type`: Text (e.g., 'equal', 'exact', 'percentage')
- `is_settlement`: Boolean/Integer (Flags if the expense is a debt repayment)

### `expense_splits`
- `id`: Primary Key
- `expense_id`: Foreign Key (`expenses.id`)
- `user_id`: Foreign Key (`users.id`)
- `amount_owed`: Decimal/Real
- `share`: Integer
- `percentage`: Decimal/Real

### `anomalies_log`
- `id`: Primary Key
- `expense_id`: Foreign Key (`expenses.id`)
- `original_row_data`: Text (JSON string of the raw CSV row)
- `issue_type`: Text (e.g., 'NEGATIVE_AMOUNT', 'MATH_MISMATCH')
- `resolution`: Text (Description of the automated fix)
- `is_approved`: Boolean/Integer (Whether the user has reviewed the fix)
