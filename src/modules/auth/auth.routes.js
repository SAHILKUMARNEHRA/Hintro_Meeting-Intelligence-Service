const express = require('express');
const { z } = require('zod');

const controller = require('./auth.controller');
const { validateBody } = require('../../middleware/validate');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

router.post('/register', validateBody(registerSchema), controller.register);
router.post('/login', validateBody(registerSchema), controller.login);

module.exports = router;

