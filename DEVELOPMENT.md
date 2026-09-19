# 🚀 Red News Development Guide

Local development setup using Docker Compose for consistency across machines.

## Quick Start (5 minutes)

### 1. Prerequisites

- **Docker Desktop** (Mac/Windows) or Docker Engine (Linux)
  - Download: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version` (should be 20.10+)
- **Git** (`git --version`)
- **VS Code** (or your favorite editor)

### 2. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yuriy-o/rednews.git
cd rednews

# Copy environment template
cp .env.local.example .env.local

# (Optional) Edit .env.local if you have Google OAuth / Trading Economics API keys
# vim .env.local
```

### 3. Start Everything

```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up

# First time? This will:
# ✅ Download images (3-5 min)
# ✅ Build backend container (2-3 min)
# ✅ Initialize database
# ✅ Start migrations
# ✅ Start server on http://localhost:3000
```

### 4. Verify It Works

```bash
# In another terminal, test the API
curl http://localhost:3000/health

# Expected response: { "status": "ok" }
```

---

## Daily Workflow

### Start Development Session

```bash
docker-compose up

# Backend auto-reloads on file changes (hot reload)
# Logs show live: requests, errors, migrations, etc.
```

### Stop Session

```bash
# Stop all containers (data persists)
docker-compose stop

# Or stop + remove (safer between sessions)
docker-compose down
```

### Clean Everything

```bash
# Stop containers + remove volumes (DELETE all data!)
docker-compose down -v

# Next docker-compose up will start fresh
```

---

## Common Tasks

### Database Inspection

```bash
# Option 1: Adminer Web UI (visual database explorer)
docker-compose --profile debug up
# Open http://localhost:8080
# Login: postgres / dev_user / dev_password

# Option 2: Prisma Studio (official Prisma UI)
docker-compose exec backend npx prisma studio
# Opens http://localhost:5555

# Option 3: psql CLI
docker-compose exec postgres psql -U dev_user -d red_news
# Then: \dt (list tables), SELECT * FROM "User"; etc.
```

### Run Migrations

```bash
# Create a new migration
docker-compose exec backend npx prisma migrate dev --name add_field_name

# Apply pending migrations
docker-compose exec backend npx prisma migrate deploy

# Reset database (careful!)
docker-compose exec backend npx prisma migrate reset
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail 100
```

### Rebuild Backend Image

```bash
# After npm install or Dockerfile changes
docker-compose build --no-cache backend

# Then restart
docker-compose up
```

### Access Backend Shell

```bash
# Run command inside container
docker-compose exec backend npm run build

# Or interactive shell
docker-compose exec backend sh
# Then: npm test, ls -la, etc.
```

### Test the API

```bash
# Using curl
curl -X GET http://localhost:3000/api/v1/calendar/upcoming

# Using Postman
# 1. Import: server/api.postman_collection.json
# 2. Use base URL: http://localhost:3000/api/v1

# Using REST Client (VS Code extension)
# Create test.http file:
GET http://localhost:3000/api/v1/calendar/upcoming
```

---

## Environment Variables

### .env.local Template

```env
# Database (docker-compose provides this)
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/red_news

# Cache
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=dev-secret-key-change-in-production

# API Keys (optional for development)
GOOGLE_CLIENT_ID=          # For Google OAuth testing
TRADING_ECONOMICS_TOKEN=   # For calendar sync
TELEGRAM_BOT_TOKEN=        # For Telegram alerts
```

### Getting API Keys

1. **Google OAuth**
   - Go to https://console.cloud.google.com
   - Create OAuth 2.0 credentials
   - Authorized redirect URI: `http://localhost:3000/api/v1/auth/callback`

2. **Trading Economics**
   - Register at https://tradingeconomics.com/signal/api
   - Free tier: 100 requests/day

3. **Telegram Bot**
   - Message @BotFather on Telegram
   - Create bot, get token
   - Set webhook: `POST http://your-domain/api/v1/telegram/webhook`

---

## Troubleshooting

### Port Already in Use

```bash
# Port 5432 (PostgreSQL) in use?
lsof -i :5432
kill -9 <PID>

# Port 3000 (Backend) in use?
lsof -i :3000
kill -9 <PID>

# Or just change in docker-compose.yml:
# ports: ["5433:5432"]  # Use 5433 instead
```

### Container Crashes Immediately

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database connection failed → Wait for postgres healthcheck
# 2. Port already in use → Check above
# 3. .env.local missing vars → Copy .env.local.example
```

### Database Won't Start

```bash
# Check postgres logs
docker-compose logs postgres

# Reset volume (deletes all data!)
docker-compose down -v
docker-compose up postgres

# Wait for "database system is ready to accept connections"
```

### Out of Disk Space

```bash
# Docker can use a lot of space (images, volumes)
docker system prune

# Remove unused images/containers/volumes
docker system prune -a --volumes
```

### Slow Performance on Mac/Windows

Docker on Mac/Windows uses virtualization which can be slow:

```bash
# 1. Allocate more CPU/RAM to Docker Desktop
#    Docker Desktop → Preferences → Resources
#    Recommended: 4+ CPUs, 4+ GB RAM

# 2. Check volume mounts performance
#    Consider using named volumes instead of bind mounts

# 3. Use hardware acceleration if available
#    Docker Desktop → Preferences → General → Hardware acceleration
```

---

## Architecture

### Container Network

```
┌─────────────────────────────────────┐
│ Docker Network: red_news_network    │
├─────────────────────────────────────┤
│                                     │
│ postgres:5432                       │
│ ├─ Database: red_news               │
│ ├─ User: dev_user                   │
│ └─ Data: postgres_data volume       │
│                                     │
│ redis:6379                          │
│ ├─ Cache server                     │
│ └─ Data: redis_data volume          │
│                                     │
│ backend:3000                        │
│ ├─ NestJS API                       │
│ ├─ Hot reload on src/ changes       │
│ └─ Connects to postgres + redis     │
│                                     │
└─────────────────────────────────────┘
```

### Service Dependencies

```
backend
├── depends_on: postgres (healthcheck)
├── depends_on: redis (healthcheck)
│
postgres (standalone)
│
redis (standalone)
```

---

## Performance Tips

1. **Use named volumes** (not bind mounts) for databases
   - Faster I/O on Mac/Windows

2. **Exclude large directories** in .dockerignore
   - node_modules, dist, coverage, etc.

3. **Layer caching** in Dockerfile
   - Install deps first, copy code second
   - Rebuild only what changed

4. **Limit container logs**
   - Configured in docker-compose.yml
   - Max 20MB per service

---

## Testing

```bash
# Run backend tests
docker-compose exec backend npm test

# With coverage
docker-compose exec backend npm run test:cov

# Watch mode
docker-compose exec backend npm run test:watch
```

---

## Debugging

### VS Code Remote Containers

Install extension: "Dev Containers" by Microsoft

```json
// .devcontainer/devcontainer.json
{
  "name": "Red News Backend",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "backend",
  "workspaceFolder": "/app",
  "customizations": {
    "vscode": {
      "extensions": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
    }
  }
}
```

Then: Click "Reopen in Container" in VS Code

### Node Debugger

```bash
# In docker-compose.yml, add:
# command: node --inspect=0.0.0.0:9229 dist/main
# ports:
#   - "9229:9229"

# Then in VS Code:
# 1. Ctrl+Shift+D → Run and Debug
# 2. Select "Attach to Node in Docker"
# 3. Set breakpoints, reload browser
```

---

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Railway, Render, or Fly.io setup.

---

## Quick Reference

```bash
# Start
docker-compose up

# Stop
docker-compose stop

# Restart
docker-compose restart

# View logs
docker-compose logs -f backend

# Execute command
docker-compose exec backend npm run build

# Open database UI
docker-compose --profile debug up
# http://localhost:8080

# Rebuild
docker-compose build --no-cache

# Clean everything
docker-compose down -v

# Health check
curl http://localhost:3000/health
```

---

**Happy coding! 🚀**

For questions or issues, check [README.md](./README.md) or open an issue on GitHub.
