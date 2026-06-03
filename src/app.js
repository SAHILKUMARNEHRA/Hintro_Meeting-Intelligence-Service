const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const { swaggerUi, swaggerSpec } = require('../swagger/swagger');
const { traceIdMiddleware } = require('./middleware/traceId');
const { requestLoggerMiddleware } = require('./utils/logger');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const { ok } = require('./utils/response');

const authRoutes = require('./modules/auth/auth.routes');
const meetingRoutes = require('./modules/meetings/meeting.routes');
const analysisRoutes = require('./modules/analysis/analysis.routes');
const actionItemRoutes = require('./modules/actionItems/actionItem.routes');

const { startReminderJob } = require('./jobs/reminderJob');

const app = express();

app.disable('x-powered-by');

app.use(traceIdMiddleware);
app.use(express.json({ limit: '2mb' }));
app.use(helmet());
app.use(cors({ origin: '*', credentials: false }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(requestLoggerMiddleware);

app.get('/health', (req, res) => ok(res, { status: 'UP' }));

app.get('/api/evaluation', (req, res) =>
  ok(res, {
    candidateName: env.EVALUATION_CANDIDATE_NAME,
    email: env.EVALUATION_EMAIL,
    repositoryUrl: env.EVALUATION_REPOSITORY_URL,
    deployedUrl: env.EVALUATION_DEPLOYED_URL,
    externalIntegration: 'Telegram Bot API',
    features: [
      'JWT auth',
      'Meetings + transcripts',
      'Groq AI analysis with citations',
      'Action items + overdue detection',
      'Hourly reminders + reminder history',
      'Swagger docs',
      'Rate limiting',
    ],
  }),
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/meetings', analysisRoutes);
app.use('/api/action-items', actionItemRoutes);

app.use((req, res, next) =>
  next(new AppError('NOT_FOUND', 'Route not found', 404)),
);
app.use(errorHandler);

if (require.main === module) {
  const port = env.PORT;
  app.listen(port, () => {
    if (env.REMINDER_JOB_ENABLED) startReminderJob();
  });
}

module.exports = { app };
