# FairSplit Web Application

FairSplit is a modern, full-stack web application designed to help groups of friends, flatmates, and travelers track shared expenses seamlessly. It features a beautiful, dynamic UI and a robust dual-engine backend.

## Features
- **Group Management:** Create groups and invite users.
- **Expense Tracking:** Add expenses and split them equally, by exact amounts, or by percentages.
- **Ledger & Analytics:** View a complete history of spending and beautiful visual charts of your group's finances.
- **Smart CSV Import:** Ingest raw CSV data of past expenses. The engine automatically flags anomalies (e.g., negative numbers, math that doesn't add up) and logs them for review.

## Setup Instructions

### Local Development
This application uses a Single Monorepo structure.

1. **Install Dependencies:**
   From the root folder, install all frontend and backend dependencies in one go:
   ```bash
   npm run install-all
   ```

2. **Start the Backend:**
   The backend automatically uses a local SQLite database for blazing-fast development.
   ```bash
   cd backend
   npm run dev
   ```

3. **Start the Frontend:**
   Open a new terminal and run:
   ```bash
   cd frontend
   npm run dev
   ```
   *Note: The React frontend automatically proxies `/api` requests to the backend.*

### Production Deployment (Render)
The application is configured to deploy as a **Single Web Service** on Render, running completely for free.

1. Create a **Free PostgreSQL Database** on Render and copy the Internal Database URL.
2. Create a **New Web Service** linked to your GitHub repo.
3. Set the following Build/Start commands:
   - **Build Command:** `npm run install-all && npm run build`
   - **Start Command:** `npm start`
4. Add an Environment Variable:
   - **Key:** `DATABASE_URL`
   - **Value:** `postgres://...` (Your internal database URL)

The backend will automatically detect the `DATABASE_URL`, switch to the PostgreSQL engine, and serve the compiled React frontend!

---

## AI Usage
This application was rapidly prototyped and built with the assistance of the **Antigravity Code Assistant** (Google DeepMind). See `AI_USAGE.md` for detailed notes on AI interactions, problem-solving, and prompts.
