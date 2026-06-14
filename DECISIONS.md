# Decision Log

1. **Database Choice**: 
   - *Options*: PostgreSQL, MySQL, SQLite
   - *Decision*: SQLite.
   - *Reason*: Given the tight 2-day constraint and the requirement to submit a fully functional repository, SQLite eliminates the need for external service dependencies (like spinning up a Postgres container) for the evaluator while strictly remaining a "relational DB". It fulfills the technical requirement while maximizing portability.

2. **Frontend Styling**:
   - *Decision*: Vanilla CSS utilizing CSS Custom Properties (Variables).
   - *Reason*: To provide a modern, premium "vibrant and dynamic" aesthetic without relying on massive frameworks. CSS custom properties (`--primary`, `--surface`) allow for easy theme scaling, glassmorphism implementation, and rapid UI development.

3. **Handling of Settlements**:
   - *Decision*: Settlements are logged in the `expenses` table with `is_settlement = true`, and a single entry is pushed to `expense_splits` where the *payee* technically "owes" the payer the settlement amount.
   - *Reason*: This cleanly unifies the balance calculation logic. Instead of having separate ledgers for expenses and settlements, a settlement acts mathematically identical to an expense where the payer covered an amount specifically for the payee. 

4. **Currency Handling**:
   - *Options*: Hardcode an exchange rate vs Maintain separate ledgers.
   - *Decision*: Maintain separate ledgers (`USD` and `INR`).
   - *Reason*: Priya complained about the sheet pretending dollars are rupees. Hardcoding an exchange rate is presumptuous and could lead to loss of data accuracy. Tracking balances grouped by currency is the most correct financial engineering approach.

5. **Anomaly Resolution Workflow**:
   - *Decision*: The import happens in a two-step "Dry Run" architecture.
   - *Reason*: Meera explicitly requested to approve anything the app deletes or changes. By processing the CSV strictly in memory first, returning a `preview` JSON payload containing an `anomalies` array, and waiting for the user to submit an `/import/confirm` request, we satisfy the manual approval constraint gracefully via UI.
