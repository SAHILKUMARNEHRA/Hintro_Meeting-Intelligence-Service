const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { AppError } = require('./errorHandler');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Missing bearer token', 401));
  }

  const token = header.slice('Bearer '.length);

  try {
    const secret = env.required('JWT_SECRET');
    const decoded = jwt.verify(token, secret);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authMiddleware };

