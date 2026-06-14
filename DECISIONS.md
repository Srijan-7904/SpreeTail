# Decision Log

This document records the significant architectural and technical decisions made during the development of FairSplit.

### 1. Dual-Database Engine (SQLite & PostgreSQL)
* **Decision:** Implement a custom Universal Database Wrapper (`backend/db.js`) that automatically switches between SQLite and PostgreSQL based on the presence of a `DATABASE_URL` environment variable.
* **Options Considered:** 
  1. *SQLite Only:* Extremely fast for local development but impossible to host for free on Render due to ephemeral filesystems.
  2. *PostgreSQL Only:* Great for production, but forces local developers to install Docker or run a heavy local Postgres server just to test the app.
* **Why:** We wanted the best of both worlds. The abstraction layer ensures local development remains zero-config and lightning fast (SQLite), while allowing the app to be deployed to Render's free tier with zero data loss (PostgreSQL).

### 2. Monolithic Deployment Architecture
* **Decision:** Configure the Express backend to serve the compiled React static files in production, combining them into a single deployable service.
* **Options Considered:**
  1. *Separate Services:* Deploy the React frontend to Vercel/Netlify and the Node backend to Render.
  2. *Monolithic Service:* Deploy both in a single Render Web Service.
* **Why:** Deploying two separate services introduces severe CORS complexity, requires synchronizing environment variables across platforms, and uses up multiple free-tier allocations. A monolithic service is simpler, robust, and bypasses all CORS issues because the API and frontend share the same origin.

### 3. Vanilla CSS vs. TailwindCSS
* **Decision:** Utilize the existing custom Vanilla CSS utility system (`index.css`) rather than installing TailwindCSS.
* **Options Considered:**
  1. *Migrate to Tailwind:* Install the Tailwind build process and rewrite classes.
  2. *Vanilla Utility Classes:* Expand the provided custom utility classes.
* **Why:** The project was initialized with a custom, highly curated Vanilla CSS file. Ripping it out to install Tailwind would introduce unnecessary build dependencies and bloat the project. By sticking to the provided Vanilla CSS, we maintained a beautiful, premium aesthetic with micro-animations while keeping the toolchain incredibly lightweight.

### 4. Decimal Handling in PostgreSQL
* **Decision:** Force the `pg` driver to parse Postgres `DECIMAL` types as JavaScript `Numbers` using `pg.types.setTypeParser(1700, parseFloat)`.
* **Options Considered:**
  1. *Frontend Parsing:* Wrap every `amount` variable in `Number()` inside the React components.
  2. *Backend Parsing:* Override the Postgres driver behavior.
* **Why:** Postgres returns `DECIMAL` values as strings to prevent floating-point precision loss. This caused crashes in the React Recharts library (`.toFixed is not a function`). Fixing it globally in the database layer prevented us from having to hunt down and patch dozens of individual state variables in the React frontend.
