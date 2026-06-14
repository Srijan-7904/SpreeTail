# AI Usage Log

**AI Tool Used:** Antigravity Code Assistant by Google DeepMind

## Key Prompts
Throughout the development of FairSplit, the AI was driven by high-level natural language requests. Some of the most impactful prompts included:
* *"I want to host this on Render."* -> Prompted the AI to design a deployment strategy, migrating the codebase to a monolithic architecture so the Express backend serves the React frontend.
* *"Make both options if I want to use localhost for checker, I share the render link."* -> Prompted the AI to build a Dual-Database Engine that uses SQLite locally but automatically switches to PostgreSQL on Render.
* *"No, I want to do it in free."* -> Prompted the AI to completely rewrite the database schema and query structure to support Render's Free Postgres tier, saving the user $7/month on a disk.

---

## AI Mistakes & Corrections

Even the most advanced AI makes mistakes. Here are three concrete cases where the AI produced something wrong, how it was caught, and exactly what was changed:

### 1. Hallucinating TailwindCSS Classes
* **What went wrong:** When building the `Analytics.jsx` dashboard, the AI used utility classes like `h-64` and `md:grid-cols-2`. These are standard TailwindCSS classes, but this project was built using a custom Vanilla CSS file. Because the classes didn't exist, the Recharts graphs rendered with a height of 0px (invisible).
* **How it was caught:** The user reported: *"nothing is come spend by category and total paid by user"*. The AI realized its mistake by inspecting `index.css`.
* **What changed:** The AI removed the Tailwind classes and replaced them with inline styles (`style={{ height: '300px' }}`) and the standard `.grid-cols-2` class that actually existed in the Vanilla CSS file.

### 2. Express 5 Wildcard Routing Compatibility
* **What went wrong:** When configuring the Express backend to serve the React frontend, the AI used the standard catch-all route: `app.get('*', ...)`. However, this project uses the newly released Express v5.0. Express 5 strictly enforces `path-to-regexp` v8, which rejects the lone asterisk as an invalid parameter name.
* **How it was caught:** The Render deployment crashed on startup, throwing a fatal error: `PathError [TypeError]: Missing parameter name at index 1: *`.
* **What changed:** The AI replaced the string wildcard with a native Regular Expression `app.get(/.*/, ...)` which correctly bypasses the strict string parsing in Express 5.

### 3. Native Binary Cross-Compilation Failure (GLIBC)
* **What went wrong:** The AI instructed the user to push their entire workspace to GitHub, which accidentally included the `node_modules` folder. The `sqlite3` module contained pre-compiled native binaries built for the user's Windows machine.
* **How it was caught:** When Render (which runs Linux) attempted to boot the app, it crashed with `invalid ELF header` and `GLIBC_2.38 not found`, because it couldn't execute the Windows binary.
* **What changed:** The AI created a `.gitignore` file and removed `node_modules` from the git cache via `git rm -r --cached`. To permanently bulletproof the app against SQLite binary issues on Render, the AI also rewrote the database layer to *dynamically import* `sqlite3` only if the Postgres `DATABASE_URL` was missing. This ensured Render never even attempted to load the broken binary at runtime.
