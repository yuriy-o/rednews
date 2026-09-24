# 🚀 Render.com Deployment Guide

Deploy Red News backend to Render.com **FREE Tier** in 10 minutes.

---

## What You'll Get

```
✅ NestJS Backend (port 3000)
✅ PostgreSQL Database (256MB - FREE)
✅ SSL/HTTPS Certificate (auto)
✅ Domain: https://red-news-api.onrender.com
✅ Auto-deploy on git push
✅ Monitoring & Logs

💰 Cost: $0/month (FREE tier)
```

---

## Prerequisites

- GitHub account (with rednews repo)
- This file: `render.yaml` (already in repo)
- This script: `server/render-build.sh` (already in repo)

---

## Step 1: Sign Up on Render.com

1. Go to https://render.com
2. Click **"Sign up"**
3. Select **"Continue with GitHub"**
4. Authorize Render to access your repos
5. Confirm email

Done! You're logged in. ✅

---

## Step 2: Create New PostgreSQL Database

**This is the storage layer for your backend.**

### In Render Dashboard:

1. Click **"+ New +"** button (top right)
2. Select **"PostgreSQL"**
3. Configure:
   - **Name:** `red-news-postgres`
   - **Database:** `red_news`
   - **User:** `postgres`
   - **Region:** `Frankfurt` (or closest to you)
   - **PostgreSQL Version:** `15`
   - **Plan:** `Free`
4. Click **"Create Database"**

**Wait 2-3 minutes** for database to initialize.

Once ready, you'll see:
```
Database: red_news
User: postgres
Password: [auto-generated]
Internal Database URL: [copy this]
External Database URL: [copy this]
```

**Save the "Internal Database URL"** - you'll need it for backend.

---

## Step 3: Create Web Service (Backend)

**This is your NestJS API server.**

### In Render Dashboard:

1. Click **"+ New +"** button
2. Select **"Web Service"**
3. Select your **rednews** repository
4. Configure:

```
Name: red-news-api
Environment: Node
Build Command: bash render-build.sh
Start Command: npm run start:prod
Plan: Free
Region: Frankfurt (same as DB)
Root Directory: server
```

5. Click **"Create Web Service"**

**Wait 3-5 minutes** for build and deployment.

You'll see logs like:
```
Building Red News Backend for Render...
📦 Installing dependencies...
🔧 Generating Prisma client...
🗄️  Running database migrations...
🔨 Building TypeScript...
✅ Build complete!
```

Once deployed, you'll see:
```
Service: red-news-api
URL: https://red-news-api.onrender.com
Status: Live ✅
```

---

## Step 4: Add Environment Variables

**Set secrets safely in Render Dashboard.**

### Go to: red-news-api Service → Environment

Add these variables:

#### Public Variables:
```
NODE_ENV = production
PORT = 3000
CORS_ORIGIN = https://rednews.app,https://app.rednews.app,chrome-extension://*
```

#### Secret Variables (click "Secret" checkbox):

1. **DATABASE_URL**
   - Value: Paste the "Internal Database URL" from Step 2
   - Example: `postgresql://postgres:xxxx@dpg-xxx.onrender.com:5432/red_news`

2. **JWT_SECRET**
   - Generate a random secret:
     ```bash
     openssl rand -hex 32
     # Output: a1b2c3d4e5f6... (copy this)
     ```
   - Value: Paste the generated secret
   - ⚠️ **KEEP SECRET! Never commit to GitHub!**

3. **GOOGLE_CLIENT_ID** (optional, if you have Google OAuth)
4. **GOOGLE_CLIENT_SECRET** (optional)
5. **TRADING_ECONOMICS_TOKEN** (optional)

### Save Changes

Click **"Save Changes"** button.

**Wait 30-60 seconds** for service to restart with new env vars.

---

## Step 5: Test Your API

### Test Health Endpoint

```bash
curl https://red-news-api.onrender.com/health

# Expected response:
# { "status": "ok" }
```

### Test Calendar Endpoint

```bash
curl https://red-news-api.onrender.com/api/v1/calendar/upcoming

# Expected response:
# { "count": 0, "events": [] }
```

If you get these responses, **YOU'RE LIVE!** 🎉

---

## Step 6: Update Extension to Use Render API

Edit `extension/src/background.ts`:

```typescript
// OLD (Supabase):
const API_URL = 'https://your-supabase-url.supabase.co/functions/v1';

// NEW (Render):
const API_URL = 'https://red-news-api.onrender.com/api/v1';

// Update all API calls:
async function callCalendar(from: number, to: number) {
  const response = await fetch(
    `${API_URL}/calendar/events?from=${from}&to=${to}`
  );
  return response.json();
}

async function getNews() {
  const response = await fetch(`${API_URL}/calendar/upcoming`);
  const data = await response.json();
  return data.events;
}
```

Then:
```bash
cd extension
npm run build
```

---

## Step 7: Enable Auto-Deploy

**Render auto-deploys on every git push!** ✅

### Verify it works:

1. Make a change to `server/src/main.ts`
2. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify auto-deploy from Render"
   git push origin main
   ```
3. Watch Render Dashboard:
   - You'll see "Build in progress"
   - After 2-3 minutes: "Live" ✅
4. Test API again:
   ```bash
   curl https://red-news-api.onrender.com/health
   ```

**Every time you push to main, your API updates automatically!** 🚀

---

## Monitoring & Logs

### View Logs

In Render Dashboard → red-news-api → Logs tab:

```
✅ You'll see:
- Request logs
- Error messages
- Database connections
- Build output
```

### Monitor Performance

In Render Dashboard → red-news-api → Metrics tab:

```
✅ You'll see:
- CPU usage
- Memory usage
- Requests per minute
- Response times
```

---

## Troubleshooting

### API shows 503 (Service Unavailable)

**Cause:** Database connection failed

**Fix:**
1. Check DATABASE_URL env var
2. Verify it matches PostgreSQL URL from Step 2
3. Restart service: Dashboard → red-news-api → "Restart" button

### Build fails with "Database connection error"

**Cause:** Prisma migrations failed

**Fix:**
1. Check logs: Dashboard → Logs tab
2. Verify DATABASE_URL is correct
3. Check if database is running: Dashboard → Databases → Check status

### Slow first request (10+ seconds)

**This is normal on FREE tier!**

Why: FREE instances sleep after 15 minutes of inactivity, and first request wakes them up.

Solution: Add a monitoring service to ping your API every 5 minutes:
- Use https://uptime.kuma.pet/ (FREE)
- Or https://www.uptimerobot.com/ (FREE tier)

---

## Upgrading to Paid (Later)

When your project starts generating revenue:

```
Paid Tier Pricing:

┌────────────┬──────────┬──────────┐
│ Service    │ FREE     │ Paid     │
├────────────┼──────────┼──────────┤
│ Backend    │ Sleeps   │ Always-on│
│            │ $0/mo    │ $7/mo    │
├────────────┼──────────┼──────────┤
│ Database   │ 256MB    │ 1GB+     │
│            │ $0/mo    │ $15/mo   │
├────────────┼──────────┼──────────┤
│ TOTAL      │ $0/mo    │ $22/mo   │
└────────────┴──────────┴──────────┘

To upgrade: Dashboard → Modify Plan
```

---

## Complete Architecture (Now)

```
┌─────────────────────────────────────┐
│ Your Code (GitHub)                  │
│ git push origin main                │
└──────────┬──────────────────────────┘
           │ Webhook
           ↓
┌─────────────────────────────────────┐
│ Render.com                          │
│ ├─ Build & Deploy (auto)           │
│ ├─ NestJS Backend (3000)           │
│ └─ PostgreSQL Database              │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ Live API                            │
│ https://red-news-api.onrender.com   │
│ /api/v1/calendar/upcoming           │
│ /api/v1/auth/google                 │
│ /api/v1/user/settings               │
└─────────────────────────────────────┘
           ↑
           │ API calls
           │
┌─────────────────────────────────────┐
│ Extension (rednews.app)             │
│ Chrome → Red News Tab               │
│ Fetch events from Render API        │
└─────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Deploy to Render (you just did!)
2. ⏳ Update extension to use Render API
3. ⏳ Test end-to-end
4. ⏳ Deploy extension to Chrome Web Store (or test locally)
5. ⏳ Set up monitoring (uptimerobot)

---

## Support

If something goes wrong:

1. **Check Render Logs**: Dashboard → Logs tab
2. **Check Build Output**: Dashboard → Deployments tab
3. **Test locally first**: `docker-compose up` to verify it works
4. **Verify env vars**: Dashboard → Environment → Check DATABASE_URL, JWT_SECRET

---

**You're now live on Render.com! 🎉**

Cost: **$0/month**
Deployment time: **3-5 minutes**
Time to make changes: **2-3 minutes** (auto-deploy on push)

Happy deploying! 🚀
