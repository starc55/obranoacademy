# OBRANO Academy deployment

The frontend is a Vite SPA in the repository root. The Express API is a separate Node service in `server/` and uses Neon Postgres.

## 1. Local production checks

Create local environment files from the templates:

```powershell
Copy-Item .env.example .env
Copy-Item server/.env.example server/.env
```

Put the real backend credentials only in `server/.env`. Do not commit either `.env` file.

```powershell
# Frontend
npm install
npm run lint
npm run build

# Backend
Set-Location server
npm install
npm start
```

The API health endpoint is `http://localhost:5000/`. For running both development servers after installing both sets of dependencies, use `npm run dev:all` from the repository root.

## 2. GitHub

Review the changes before committing. No deployment command is run automatically.

```powershell
git status
git add .
git commit -m "Prepare project for production deployment"
git push origin main
```

## 3. Render backend

Connect the GitHub repository and create a Web Service, or apply the included `render.yaml` Blueprint.

- Service type: Web Service
- Root Directory: `server`
- Runtime: Node
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/`

Set these environment variables in Render:

- `NODE_ENV=production`
- `DATABASE_URL` (required)
- `ADMIN_EMAIL` (required)
- `ADMIN_PASSWORD` (required; use a strong unique password)
- `JWT_SECRET` (required; generated automatically by `render.yaml`, otherwise set a long random value)
- `CLIENT_URL` (required; set this to the exact Vercel production origin after frontend deployment)
- `TELEGRAM_BOT_TOKEN` (optional; required only for Telegram notifications)
- `TELEGRAM_CHAT_ID` (optional; required only for Telegram notifications)

Render provides `PORT` automatically. Do not hardcode it.

## 4. Vercel frontend

Import the same GitHub repository into Vercel using:

- Framework Preset: Vite
- Root Directory: repository root
- Build Command: `npm run build`
- Output Directory: `dist`

Add this Vercel environment variable for Production and Preview as appropriate:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

`vercel.json` contains the React Router SPA fallback. `VITE_API_URL` is public browser configuration, so it must never contain a secret.

## 5. Connect the deployments

After Vercel provides the production URL:

1. Set Render `CLIENT_URL` to the exact origin, for example `https://your-project.vercel.app` (no trailing path).
2. Redeploy or restart the Render backend.
3. Open the Render root URL and confirm the JSON health response.
4. Test login, attendance (group and individual), student create/edit, groups, payments, notifications, reports, dashboard, and all delete/update actions.

If a custom Vercel domain is added later, update `CLIENT_URL` on Render to that exact origin and redeploy the backend.

## Architecture notes

- Backend entry file: `server/index.js`
- Database: Neon Postgres via `@neondatabase/serverless`
- Authentication: backend-validated, signed 12-hour bearer session token stored in browser localStorage
- File uploads: none
- Prisma: not used
- Optional external service: Telegram Bot API
