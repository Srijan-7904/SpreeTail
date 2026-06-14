# AI Usage Log

## AI Tools Used
- **Google DeepMind Antigravity Code Agent**: Used as the primary pair-programmer and autonomous development engine to scaffold, architect, and implement the application.

## Key Prompts
- *Initial Project Setup*: "Assignment: Build a Shared Expenses App... use react node js make this project"
- *Iterative Steps*: "Continue", "implementt this project project node+react"

## Three Concrete Cases Where the AI Produced Something Wrong

1. **Incorrect placement of the Implementation Plan**
   - *What the AI did wrong*: The AI initially attempted to create `implementation_plan.md` in the root of the user's project directory instead of its required isolated internal artifact directory.
   - *How it was caught*: The internal validation system threw a strict pathing error (`invalid_args: c:\Users\oj\Desktop\expence app anti\implementation_plan.md is not a valid artifact path`).
   - *What was changed*: The AI self-corrected its tool arguments to write the file strictly to `C:\Users\oj\.gemini\antigravity\brain\.../implementation_plan.md`.

2. **Flawed Settlement Splitting Logic**
   - *What the AI did wrong*: When first writing the `GET /api/balances` engine, the AI added a TODO comment realizing it had no logical way to process settlements because it didn't create `expense_splits` rows for them in the backend confirmation endpoint. It left the settlement block empty.
   - *How it was caught*: While writing the endpoint, the AI logically deduced that without an `expense_splits` row, the payer's positive balance wouldn't correctly subtract from the specific payee's negative balance.
   - *What was changed*: The AI entirely rewrote the `app.post('/api/expenses/import/confirm')` logic to insert a targeted single-user split for the payee during a settlement event. It then deleted the specialized settlement checking logic from the `/api/balances` endpoint since settlements now evaluated identically to normal expenses natively inside the database.

3. **Vite Frontend Setup Command Inactivity**
   - *What the AI did wrong*: The AI initially thought about running `npx create-vite@latest frontend --template react` but then recognized Vite prompts for inputs interactively which blocks the terminal background task. 
   - *How it was caught*: Reviewing its own internal guidelines, the AI recognized the strict requirement: "You should run in non-interactive mode so that the user doesn't need to input anything."
   - *What was changed*: The AI correctly modified the terminal command to use the non-interactive flags and current directory structure (`mkdir frontend; cd frontend; npx -y create-vite@latest . --template react`).
