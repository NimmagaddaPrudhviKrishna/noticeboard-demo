# College Notice Board Announcement System

A simple **single-page** full-stack web application for posting and viewing
college notices/announcements. Built as a minor project — deliberately kept
small and easy to explain.

## Tech Stack

- **Backend:** Node.js + Express
- **Storage:** local JSON file when run on your own machine; Upstash Redis
  (via Vercel Marketplace) when deployed to Vercel — see `db.js` and `DEPLOY.md`
- **Auth:** JWT stored in an httpOnly cookie for admin login — stateless, so
  it works locally and on serverless hosting alike. Passwords are stored and
  checked as plain text (no hashing library), kept simple on purpose for this
  project — see the security note below.
- **Frontend:** A single `index.html` page with plain HTML, CSS, and
  JavaScript (no framework/build step). The board, the login form, and the
  admin dashboard are all sections of the same page, shown/hidden by JS —
  there's no page reload when you log in or navigate.

Want to deploy this on Vercel? See **DEPLOY.md** for step-by-step instructions.

## Features

- Public notice board — anyone can view notices, no login required
- Search notices by keyword
- Filter by category (General, Academic, Exam, Event, Placement, Holiday)
- Filter by priority (Urgent / Normal) — urgent notices are highlighted
- Admin login (default: `admin` / `admin123`), all on the same page as the board
- Admin dashboard to Create, Edit, and Delete notices
- Data persists in a local JSON file, so it survives server restarts

## Project Structure

```
notice-board/
├── server.js          # Express app + REST API routes
├── db.js               # Data layer: local JSON file, or Upstash Redis on Vercel
├── api/index.js         # Vercel serverless entry point (wraps server.js)
├── vercel.json           # Routes /api/* to the serverless function
├── package.json
├── DEPLOY.md              # Vercel deployment steps
├── data/                # Auto-created on first LOCAL run (gitignored)
└── public/
    ├── index.html       # The single page: board + login + admin dashboard
    ├── css/style.css
    └── js/
        └── app.js        # All frontend logic: view switching, board, auth, CRUD
```

## How to Run

1. Make sure [Node.js](https://nodejs.org) (v16+) is installed.
2. Open a terminal in the project folder.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open your browser at **http://localhost:3000**
   - The board loads by default
   - Click **"Admin Login"** in the top nav to log in, right there on the same page
   - Once logged in, the nav link becomes **"Dashboard"** so you can get back to it,
     and a **Logout** button appears

Default admin credentials:
- **Username:** `admin`
- **Password:** `admin123`

To change them: edit the seeded values in `db.js` (look for the `admin` object
in `ensureSeed`), delete `data/store.json` if it already exists locally so it
re-seeds, and restart the server.

### A quick note on the plain-text password

This app stores and compares the admin password as plain text rather than
hashing it, at your request, to keep the code simple for a minor project demo.
That's fine for a local classroom demo, but it's worth knowing (and worth
mentioning in your report) that a production system should never store
passwords in plain text — hashing with something like bcrypt is the standard
fix, and it's a natural "future improvement" to mention if asked in a viva.

## API Endpoints (for reference in your project report)

| Method | Endpoint            | Auth required | Description                  |
|--------|----------------------|----------------|-------------------------------|
| GET    | /api/notices          | No             | List notices (supports `?q=`, `?category=`, `?priority=`) |
| GET    | /api/notices/:id      | No             | Get a single notice           |
| POST   | /api/notices          | Yes (admin)    | Create a new notice           |
| PUT    | /api/notices/:id      | Yes (admin)    | Update a notice               |
| DELETE | /api/notices/:id      | Yes (admin)    | Delete a notice               |
| POST   | /api/login            | No             | Admin login                   |
| POST   | /api/logout           | Yes (admin)    | Admin logout                  |
| GET    | /api/session          | No             | Check current login state     |

## Possible Extensions (if you want to expand the project)

- Hash the admin password (e.g. with bcrypt) instead of storing it as plain text
- Multiple admin accounts / roles (e.g. faculty vs. student council)
- File attachments on notices (PDF circulars, images)
- Email or push notifications for urgent notices
- Swap the JSON file storage for MySQL/MongoDB
- Comments or acknowledgement ("Seen by") tracking on notices
