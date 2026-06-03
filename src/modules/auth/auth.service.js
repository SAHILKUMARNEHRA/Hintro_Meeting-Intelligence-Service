const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { getPrisma } = require('../../config/db');
const { env } = require('../../config/env');
const { AppError } = require('../../middleware/errorHandler');

async function register({ email, password }) {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });
    return user;
  } catch (err) {
    if (err && err.code === 'P2002') {
      throw new AppError('CONFLICT', 'Email already registered', 409);
    }
    throw err;
  }
}

async function login({ email, password }) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);

  const secret = env.required('JWT_SECRET');
  const token = jwt.sign({ email: user.email }, secret, {
    subject: user.id,
    expiresIn: '7d',
  });

  return {
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  };
}

module.exports = { register, login };

