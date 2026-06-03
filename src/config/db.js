const { PrismaClient } = require('@prisma/client');
const { env } = require('./env');

let prisma;

function getPrisma() {
  if (prisma) return prisma;
  const databaseUrl = env.required('DATABASE_URL');
  prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  return prisma;
}

module.exports = { getPrisma };

