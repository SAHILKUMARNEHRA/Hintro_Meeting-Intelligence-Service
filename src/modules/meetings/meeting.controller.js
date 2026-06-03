const { created, ok } = require('../../utils/response');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./meeting.service');

const createMeeting = asyncHandler(async (req, res) => {
  const meeting = await service.createMeeting(req.user.id, req.body);
  return created(res, { meeting });
});

const listMeetings = asyncHandler(async (req, res) => {
  const result = await service.listMeetings(req.user.id, req.query);
  return ok(res, result);
});

const getMeeting = asyncHandler(async (req, res) => {
  const meeting = await service.getMeeting(req.user.id, req.params.id);
  return ok(res, { meeting });
});

module.exports = { createMeeting, listMeetings, getMeeting };

