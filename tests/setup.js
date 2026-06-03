const { getPrisma } = require('../src/config/db');

const prisma = getPrisma();

beforeEach(async () => {
  await prisma.reminderHistory.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.analysis.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

