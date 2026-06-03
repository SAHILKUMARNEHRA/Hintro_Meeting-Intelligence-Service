## Changelog

### 1.0.0
- Initialized Node/Express backend with consistent response envelope and trace IDs
- Added Prisma schema + migrations for users, meetings, analyses, action items, and reminder history
- Implemented JWT auth (register/login)
- Implemented meeting create/list/get endpoints
- Implemented Groq AI analysis endpoint with strict JSON schema + citation validation
- Implemented action item management endpoints (create/list/filter/update status/overdue)
- Implemented hourly reminder job and Telegram integration
- Added Swagger UI and evaluation/health endpoints
- Added Jest tests and GitHub Actions CI
- Added Docker support

