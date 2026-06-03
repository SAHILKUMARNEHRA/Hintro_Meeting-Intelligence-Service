const { ok } = require('../../utils/response');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./analysis.service');

const analyzeMeeting = asyncHandler(async (req, res) => {
  const result = await service.analyzeMeeting(req.user.id, req.params.id);
  return ok(res, result);
});

module.exports = { analyzeMeeting };

