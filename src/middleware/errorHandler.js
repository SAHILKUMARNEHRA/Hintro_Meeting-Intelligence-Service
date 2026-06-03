const { errorPayload } = require('../utils/response');
const { logError } = require('../utils/logger');

class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function normalizeError(err) {
  if (err instanceof AppError) return err;

  if (err && err.name === 'JsonWebTokenError') {
    return new AppError('UNAUTHORIZED', 'Invalid token', 401);
  }

  if (err && err.name === 'TokenExpiredError') {
    return new AppError('UNAUTHORIZED', 'Token expired', 401);
  }

  if (err && err.code === 'P2002') {
    return new AppError('CONFLICT', 'Unique constraint violation', 409);
  }

  if (err && err.code === 'P2025') {
    return new AppError('NOT_FOUND', 'Resource not found', 404);
  }

  return new AppError('INTERNAL_ERROR', 'Internal server error', 500);
}

function errorHandler(err, req, res, next) {
  const normalized = normalizeError(err);
  res.status(normalized.status);
  logError(req, res, err);
  res.json(errorPayload(res, normalized.code, normalized.message));
}

module.exports = { errorHandler, AppError };

