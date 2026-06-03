## Testing

### What Is Covered
- Meetings
  - Register/login
  - Create meeting with transcript
  - List meetings with pagination
  - Get meeting by id
- Action items
  - Create manual action item
  - List overdue action items
  - Update status to COMPLETED and confirm it is no longer overdue

### How To Run
Prerequisite: a Postgres database with migrations applied.

```bash
npx prisma migrate deploy
npm test
```

### Edge Cases Considered
- Missing/invalid JWT
- Invalid UUID params
- Transcript timestamp format errors
- Invalid status enum values

### Known Limitations
- AI analysis integration is not unit-tested (requires real Groq API key and network access).
- Reminder job integration is not unit-tested (requires Telegram bot credentials).

