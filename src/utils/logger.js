function log(level, payload) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    log('info', {
      traceId: res.locals.traceId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}

function logError(req, res, err) {
  log('error', {
    traceId: res.locals.traceId,
    method: req.method,
    path: req.originalUrl,
    status: res.statusCode,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });
}

module.exports = { requestLoggerMiddleware, log, logError };

