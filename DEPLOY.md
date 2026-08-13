# Deploying to Vercel

Vercel runs your backend as **serverless functions** with a read-only filesystem,
so this app now uses:

- **Vercel Marketplace Redis (Upstash)** for data storage, instead of a local JSON file
- A **JWT cookie** for admin login, instead of a server-side session

Locally (`npm start`) it still falls back to a JSON file automatically, so local dev needs no setup.

## Steps

### 1. Push the project to a GitHub repo
Vercel deploys from a Git repository (GitHub/GitLab/Bitbucket).

```
git init
git add .
git commit -m "Notice board app"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import the project into Vercel
- Go to https://vercel.com/new
- Import the GitHub repo
- Framework preset: **Other** (it's plain Node/Express) — Vercel will auto-detect
  `api/index.js` as a serverless function and `public/` as static files
- Click **Deploy** (it will succeed even before the database step below — the
  site loads, but login/posting won't work yet)

### 3. Add a Redis database (for persistent storage)
- In your Vercel project, go to the **Storage** tab
- Click **Create Database** → choose **Redis** (powered by Upstash) from the Marketplace
- Once created, connect it to your project — this automatically adds the
  `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`) environment variables to your project

### 4. Set a JWT secret
- Go to **Settings → Environment Variables**
- Add `JWT_SECRET` with any long random string (used to sign admin login tokens)

### 5. Redeploy
- Go to **Deployments** and redeploy (or just push a new commit) so the new
  environment variables take effect

### 6. Visit your site
- Everything is on one page: `https://<your-project>.vercel.app/`
- Click **"Admin Login"** in the nav to log in without leaving the page
- Default credentials: `admin` / `admin123` (change these before sharing the
  link widely — see below)

## Changing the default admin password

The admin account is seeded once into Redis the first time the app runs. To set
your own credentials before that first run, edit the `username`/`password`
values in the `admin` seed object inside `db.js` (in `ensureSeed`), commit,
and deploy — they'll be written to Redis on first request. Passwords are
stored as plain text in this project (no hashing library), which keeps the
code simple for a class demo but should not be reused for anything beyond
that — see the note in `README.md`.

## Notes for your project report

- Storage: Upstash Redis (serverless-friendly key-value store), accessed via
  the `@upstash/redis` client
- Auth: stateless JWT stored in an httpOnly cookie, verified on each protected
  request — this design works across serverless function invocations, unlike
  in-memory sessions. Passwords are checked as plain text (no hashing).
- Hosting: Vercel serverless functions (`/api/index.js`) + static hosting for
  the single-page frontend (`/public`)
