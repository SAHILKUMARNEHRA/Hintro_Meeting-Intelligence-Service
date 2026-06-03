## Meeting Intelligence Service

Backend API that stores meetings + transcripts, generates Groq-powered insights with timestamp citations, tracks action items, detects overdue items, and sends Telegram reminders.

### Tech Stack
- Node.js + Express
- PostgreSQL
- Prisma ORM
- JWT auth
- Groq API (llama3-8b-8192)
- node-cron
- Telegram Bot API
- Swagger UI at `/api-docs`

### Setup

#### Prerequisites
- Node.js 18+ (tested on Node 22)
- PostgreSQL database (local, Neon, or any managed Postgres)

#### Install
```bash
cd meeting-intelligence
npm install
cp .env.example .env
```

#### Configure env
Set at least:
- `DATABASE_URL`
- `JWT_SECRET`
- `GROQ_API_KEY` (required only for `/api/meetings/:id/analyze`)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (required only for reminders)

#### Run migrations
```bash
npx prisma generate
npx prisma migrate dev
```

#### Start locally
```bash
npm run dev
```

### API Response Format
- Success: `{ traceId, success: true, data: {} }`
- Error: `{ traceId, success: false, error: { code, message } }`

### Quick API Examples

#### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'
```

#### Create meeting
```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Weekly Sync",
    "transcript":[
      {"timestamp":"00:10","speaker":"Alice","text":"We should ship by Friday."},
      {"timestamp":"00:20","speaker":"Bob","text":"I will handle the deployment."}
    ]
  }'
```

#### Analyze meeting (Groq)
```bash
curl -X POST http://localhost:3000/api/meetings/<MEETING_ID>/analyze \
  -H "Authorization: Bearer <JWT>"
```

#### Create action item manually
```bash
curl -X POST http://localhost:3000/api/action-items \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"meetingId":"<MEETING_ID>","task":"Send recap","assignee":"Sahil","dueDate":"2026-06-10T10:00:00.000Z"}'
```

#### Overdue items
```bash
curl http://localhost:3000/api/action-items/overdue \
  -H "Authorization: Bearer <JWT>"
```

### Deployment (Render)
- Create a new Web Service from this GitHub repo
- Add environment variables from `.env.example`
- Use a managed Postgres (e.g. Neon) and set `DATABASE_URL`
- Build command:
```bash
npm ci && npx prisma generate && npx prisma migrate deploy
```
- Start command:
```bash
npm start
```

### Docker
This repo includes `Dockerfile` and `docker-compose.yml` for local usage. If you have Docker installed:
```bash
docker compose up --build
```

