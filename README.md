# Becoming: Personal Accountability Web Application

Becoming is a focused personal accountability web application built to sustain consistency across university studies, software engineering projects, personal growth, health, and daily responsibilities over a 65-day journey (October 27, 2026, through December 31, 2026).

The name **Becoming** represents intentional growth through small, quiet, persistent actions kept each day.

---

## Product Philosophy

This application is designed as a personal operating system, not a commercial SaaS:

- **Consistency over perfection:** Incomplete days are not failures.
- **Honest accountability without shame:** A missed day is simply an invitation to begin again gently.
- **Restrained visual calm:** Clean dark surfaces (Midnight Ink and Deep Slate) with functional, intentional accents (Electric Violet, Mint, Soft Amber).
- **Zero bloat:** Pure HTML5, modern CSS, and vanilla JavaScript with local browser storage. No node_modules, build tools, or cloud databases required.

---

## Key Features

1. **Active 65-Day Dashboard**
   - Displays real-time day index (Day 1 of 66: Oct 27 to Dec 31, 2026).
   - Days completed and remaining journey progress bar.
   - Designates today's North Star main priority (+10 points).
   - Today's planned task checklist with instant completion toggles.
   - Weekly focus overview and 7-day consistency strip.
   - Milestone progress tracker (Bronze 25 pts, Silver 60 pts, Gold 100 pts).

2. **Daily Planning & Habit System**
   - Create, edit, complete, and delete scheduled tasks.
   - Categorize by University, Main Project, Learning, Internship, Health, or Personal.
   - Optional duration estimates and notes.
   - Six editable recurring foundational habits:
     - Complete meaningful university study (+5 pts)
     - Work on the main software project (+5 pts)
     - Make a meaningful GitHub contribution (+3 pts)
     - Complete a daily review (+2 pts)
     - Record phone screen time
     - Maintain a reasonable bedtime routine

3. **The 65-Day Journey Timeline**
   - Interactive calendar covering October (5 days), November (30 days), and December (31 days).
   - Day cells show task completion status and points earned.
   - Day Inspector modal allows viewing any past or upcoming day's tasks, habits, and notes.

4. **Accountability Points Ledger & Anti-Exploit System**
   - Transparent points ledger stored permanently.
   - Toggling tasks back and forth does not generate duplicate points.
   - Accidental checks can be undone without corrupting the historical ledger.
   - Recovery bonus (+5 points) awarded when returning to action after an off day.
   - Points are never subtracted for missed days.

5. **Main Project & GitHub Progress Log**
   - Form fields: What I worked on, What I completed, What I learned, Next clear step, and GitHub commit/PR link.
   - Reverse chronological timeline of engineering accomplishments.

6. **University & Internship Hub**
   - University study session logger with duration and topics covered (+5 pts).
   - Academic exam and deadline tracker with initial editable placeholder for November 4, 2026.
   - Internship task manager for weekly assignments, recurring meetings, and deliverables.

7. **Phone Screen-Time Tracking**
   - Designed for manual entry using Android Digital Wellbeing statistics.
   - Calculates daily screen time totals, historical entries, and 7-day visual trend bars.

8. **End-of-Day & Weekly Retrospectives**
   - Daily Review with 5 prompts (Accomplished, Learned, Distractions, Tomorrow's Priority, 1-5 Effort Rating).
   - Weekly Review summarizing real data across each of the 10 weeks of the journey with guided reflection.

9. **Data Safety, Backup & Portability**
   - Export complete state to downloadable JSON file.
   - Validate and restore backups with confirmation dialogs.
   - Hard reset option with confirmation warning.
   - Advisory banner on browser localStorage behavior.

---

## File Structure

```text
Becoming(my personal tracker)/
├── index.html     # Semantic markup and accessible UI components
├── style.css      # Midnight Ink design system and responsive layout
├── app.js         # Core application logic, points engine, and state management
├── README.md      # Documentation and deployment instructions
├── LICENSE        # Standard MIT License
└── .gitignore     # Ignored local files and logs
```

---

## How to Run Locally

Because this application uses standard web technologies with no compilation steps, you can run it immediately in any modern web browser:

### Option A: Direct Browser Opening
1. Navigate to the project folder: `c:\Projects\Becoming(my personal tracker)`
2. Double-click `index.html` (or right-click and choose "Open With" > Chrome / Firefox / Edge / Safari).

### Option B: Local Web Server (Recommended)
Using Python or Node.js to serve the directory:

```bash
# Using Python 3:
python -m http.server 3000

# Or using Node npx:
npx serve .
```

Then visit `http://localhost:3000` in your browser.

---

## How to Deploy to Vercel

Becoming is completely static and ready for instant deployment on Vercel:

### Method 1: Vercel CLI
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy directly from the project directory
vercel
```

### Method 2: Git Repository (GitHub / GitLab / Bitbucket)
1. Push this directory to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Becoming web application"
   git branch -M main
   git remote add origin https://github.com/<your-username>/becoming.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your `becoming` repository.
4. Leave build command and output directory default (root directory `./`).
5. Click **Deploy**. Vercel will provide an HTTPS production URL within seconds.

---

## Known Considerations & Design Choices

- **LocalStorage Scope:** Data is saved locally in your current browser. Switching browsers or clearing website data will reset the local cache. Use the **Data & Settings > Download JSON Backup** button regularly to safeguard your progress.
- **Screen Time Tracking:** As modern web browsers cannot programmatically access Android system settings, screen time is logged manually from Android Digital Wellbeing.
- **Date Handling:** Dates are treated strictly as local calendar dates (`YYYY-MM-DD`) rather than UTC timestamps, preventing timezone shift errors across midnight.

---

## License

This project is licensed under the terms of the [MIT License](LICENSE).

