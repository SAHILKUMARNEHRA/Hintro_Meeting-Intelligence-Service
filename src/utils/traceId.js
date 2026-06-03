const { randomUUID } = require('crypto');

function newTraceId() {
  return randomUUID();
}

module.exports = { newTraceId };
