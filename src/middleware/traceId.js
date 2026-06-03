const { newTraceId } = require('../utils/traceId');

function traceIdMiddleware(req, res, next) {
  const traceId = newTraceId();
  req.traceId = traceId;
  res.locals.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
}

module.exports = { traceIdMiddleware };

