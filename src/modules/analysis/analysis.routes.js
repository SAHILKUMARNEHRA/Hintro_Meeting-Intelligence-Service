const express = require('express');
const { z } = require('zod');

const { authMiddleware } = require('../../middleware/auth');
const { validateParams } = require('../../middleware/validate');
const controller = require('./analysis.controller');

const router = express.Router();

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

router.post('/:id/analyze', authMiddleware, validateParams(idParamsSchema), controller.analyzeMeeting);

module.exports = router;

