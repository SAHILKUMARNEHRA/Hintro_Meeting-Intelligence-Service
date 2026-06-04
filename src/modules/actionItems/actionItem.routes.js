const express = require('express');
const { z } = require('zod');

const controller = require('./actionItem.controller');
const { authMiddleware } = require('../../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../../middleware/validate');
const { ActionItemStatus } = require('./actionItem.model');

const router = express.Router();

const createSchema = z.object({
  meetingId: z.string().uuid(),
  task: z.string().min(1).max(1000),
  assignee: z.string().min(1).max(200),
  dueDate: z.string().datetime().optional(),
});

const statusSchema = z.object({
  status: z.enum([ActionItemStatus.PENDING, ActionItemStatus.IN_PROGRESS, ActionItemStatus.COMPLETED]),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

const listSchema = z.object({
  status: z.enum([ActionItemStatus.PENDING, ActionItemStatus.IN_PROGRESS, ActionItemStatus.COMPLETED]).optional(),
  assignee: z.string().min(1).max(200).optional(),
  meetingId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/:id/debug', validateParams(idParamsSchema), controller.debugGetById);

router.use(authMiddleware);

router.get('/overdue', controller.listOverdue);
router.post('/', validateBody(createSchema), controller.createActionItem);
router.patch('/:id/status', validateParams(idParamsSchema), validateBody(statusSchema), controller.updateStatus);
router.get('/', validateQuery(listSchema), controller.listActionItems);

module.exports = router;
