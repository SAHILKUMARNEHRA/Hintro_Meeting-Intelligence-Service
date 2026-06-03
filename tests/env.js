process.env.NODE_ENV = 'test';
process.env.REMINDER_JOB_ENABLED = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/meeting_intelligence_test?schema=public';

