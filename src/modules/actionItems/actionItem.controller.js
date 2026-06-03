const { created, ok } = require('../../utils/response');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./actionItem.service');

const createActionItem = asyncHandler(async (req, res) => {
  const item = await service.createActionItem(req.user.id, req.body);
  return created(res, { actionItem: item });
});

const updateStatus = asyncHandler(async (req, res) => {
  const item = await service.updateStatus(req.user.id, req.params.id, req.body.status);
  return ok(res, { actionItem: item });
});

const listActionItems = asyncHandler(async (req, res) => {
  const result = await service.listActionItems(req.user.id, req.query);
  return ok(res, result);
});

const listOverdue = asyncHandler(async (req, res) => {
  const items = await service.listOverdue(req.user.id);
  return ok(res, { items });
});

module.exports = { createActionItem, updateStatus, listActionItems, listOverdue };

