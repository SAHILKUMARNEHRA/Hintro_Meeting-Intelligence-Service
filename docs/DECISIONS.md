## Key Engineering Decisions

### PostgreSQL
- Strong consistency and relational integrity for meetings, analyses, action items, and reminder history.
- JSON support (JSONB) for transcript segments and citation lists without losing structure.

### JWT Authentication
- Stateless and simple to deploy on free tiers (no session store required).
- Works cleanly with mobile/CLI clients and Swagger try-it-out flows.

### Groq (llama3-8b-8192)
- Free tier friendly with fast inference.
- OpenAI-compatible chat completions API simplifies integration.

### Telegram Bot API
- Free, reliable delivery, and straightforward setup.
- Works well for reminders without requiring email/SMS providers.

### Prisma
- Type-safe query builder and migrations with a clean data model.
- Helps keep services focused on business logic instead of SQL string building.

