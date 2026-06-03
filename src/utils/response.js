function successPayload(res, data) {
  return {
    traceId: res.locals.traceId,
    success: true,
    data,
  };
}

function errorPayload(res, code, message) {
  return {
    traceId: res.locals.traceId,
    success: false,
    error: { code, message },
  };
}

function ok(res, data) {
  return res.status(200).json(successPayload(res, data));
}

function created(res, data) {
  return res.status(201).json(successPayload(res, data));
}

function fail(res, code, message, status = 400) {
  return res.status(status).json(errorPayload(res, code, message));
}

module.exports = { ok, created, fail, successPayload, errorPayload };

