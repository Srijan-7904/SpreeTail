# Scope & Anomaly Log

## Anomaly Log
The application handles the following specific anomalies found in the `expenses_export.csv` file:

1. **Duplicates / Conflicts**
   - *Problem*: "dinner - marina bites" logged twice by Dev. "Dinner at Thalassa" logged by both Aisha and Rohan with differing amounts.
   - *Resolution Policy*: Exact duplicates (same date, amount, and payer) are automatically removed (flagged for review). Conflicting duplicates (same date, similar description, different amounts) are kept but flagged heavily for manual user resolution during the Import Review step.

2. **Name Variations**
   - *Problem*: "priya" (lowercase) vs "Priya S" vs "Priya".
   - *Resolution Policy*: The backend standardizes all names by trimming whitespace and converting to lowercase for internal matching against the user database (`userMap`). Both "Priya S" and "priya" resolve correctly to Priya's internal User ID.

3. **Fractional Amounts**
   - *Problem*: Cylinder refill logged as `899.995`.
   - *Resolution Policy*: Fractional numbers are mathematically rounded to exactly two decimal places (e.g., `900.00`) to prevent floating-point balance drift.

4. **Invalid Percentages**
   - *Problem*: Pizza Friday percentage split adds up to 110%.
   - *Resolution Policy*: The importer automatically recalculates and normalizes percentages to ensure they sum to exactly 100%.

5. **Settlements vs Expenses**
   - *Problem*: "Rohan paid Aisha back" logged as an expense.
   - *Resolution Policy*: The importer detects the keywords "paid" and "back" in the description when `split_type` is missing. It flags this as a settlement. In the database, the payer is credited and the payee is debited exactly the settlement amount via a specialized split entry.

6. **Ambiguous Date Formats**
   - *Problem*: Date formats vary wildly (`1/2/2026`, `14-02-2026`, `14-Mar`, `4/5/2026`). 
   - *Resolution Policy*: The importer uses a robust multi-format date parser (`date-fns`). It checks multiple Indian-standard formats (`d/M/yyyy`, `dd-MM-yyyy`, `d-MMM`). "4/5/2026" is interpreted as May 4th, 2026 by default based on format precedence.

7. **Multi-currency / Exchange Rates**
   - *Problem*: US Dollars mixed with Indian Rupees.
   - *Resolution Policy*: The balance engine is currency-aware. It maintains separate balances for `USD` and `INR` per person rather than guessing an exchange rate. 

8. **Refunds / Negative Amounts**
   - *Problem*: "Parasailing refund" logged as `-30`.
   - *Resolution Policy*: Treated natively as a negative expense, which cleanly credits the payee and reverses the split liabilities against the members involved.

9. **Zero Amounts**
   - *Problem*: Swiggy order logged as `0`.
   - *Resolution Policy*: Zero amounts are validly skipped/ignored as they have no effect on balances.

10. **Members Leaving / Joining**
    - *Problem*: Meera moved out but is in April groceries. Sam moved in mid-April.
    - *Resolution Policy*: The system detects splits involving members after their explicit move-out dates (Meera left 31-March-2026) and automatically removes them from that specific expense split.

## Database Schema
The database uses **SQLite** and relies strictly on relational structures.

- **users**
  - `id` (PK)
  - `name` (String, Unique)
- **groups**
  - `id` (PK)
  - `name` (String)
- **group_members**
  - `id` (PK)
  - `group_id` (FK to groups)
  - `user_id` (FK to users)
  - `joined_at` (Date)
  - `left_at` (Date, Nullable)
- **expenses**
  - `id` (PK)
  - `group_id` (FK to groups)
  - `paid_by_user_id` (FK to users)
  - `amount` (Real)
  - `currency` (String)
  - `description` (String)
  - `date` (Date)
  - `split_type` (String: equal, percentage, unequal, share, settlement)
  - `notes` (String)
  - `is_settlement` (Boolean)
- **expense_splits**
  - `id` (PK)
  - `expense_id` (FK to expenses)
  - `user_id` (FK to users)
  - `amount_owed` (Real)
  - `share` (Integer, Nullable)
  - `percentage` (Real, Nullable)
- **anomalies_log**
  - `id` (PK)
  - `original_row_data` (Text)
  - `issue_type` (String)
  - `resolution` (String)
  - `is_approved` (Boolean)
