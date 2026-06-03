const { created, ok } = require('../../utils/response');
const { asyncHandler } = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return created(res, { user });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ok(res, result);
});

module.exports = { register, login };

