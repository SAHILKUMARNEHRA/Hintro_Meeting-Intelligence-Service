const express = require('express');
const { z } = require('zod');

const controller = require('./meeting.controller');
const { authMiddleware } = require('../../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../../middleware/validate');
const { timestampRegex } = require('./meeting.model');

const router = express.Router();

const transcriptSegmentSchema = z.object({
  timestamp: z.string().regex(timestampRegex),
  speaker: z.string().min(1).max(200).optional(),
  text: z.string().min(1).max(5000),
});

const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  happenedAt: z.string().datetime().optional(),
  transcript: z.array(transcriptSegmentSchema).min(1),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

router.use(authMiddleware);

router.post('/', validateBody(createMeetingSchema), controller.createMeeting);
router.get('/', validateQuery(paginationSchema), controller.listMeetings);
router.get('/:id', validateParams(idParamsSchema), controller.getMeeting);

module.exports = router;

