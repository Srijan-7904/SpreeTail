# Shared Expenses App (FairSplit)

A robust, full-stack shared expenses application designed to ingest and sanitize real-world messy data. Built with React (Vite) and Node.js (Express) with an SQLite backend.

## Tech Stack
- **Frontend**: React (Vite), React Router, Vanilla CSS, Lucide React (Icons), Axios
- **Backend**: Node.js, Express, SQLite (sqlite3/sqlite), csv-parser, multer
- **Database**: SQLite (relational DB constraint met without requiring external setups)

## Setup Instructions

### Prerequisites
- Node.js (v18+)

### Backend Setup
1. Open a terminal and navigate to the `backend` directory.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the backend server on `http://localhost:5000`.
   - The database (`database.sqlite`) will be automatically seeded on start if you ran the seeder script.
   - To manually seed the initial users and groups, run `node seed.js`.

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the Vite frontend server on `http://localhost:5173`.
4. Open the browser to the provided localhost URL.

## AI Used
- **AI Tool**: Internal Google DeepMind Assistant (Antigravity code agent).
- **Role**: Primary development collaborator, responsible for scaffolding the project, writing boilerplate code, and implementing the anomaly detection engine under the direction of the engineer.

See `AI_USAGE.md` for full details.
