const { getPrisma } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

async function createMeeting(userId, { title, happenedAt, transcript }) {
  const prisma = getPrisma();
  const meeting = await prisma.meeting.create({
    data: {
      title,
      happenedAt: happenedAt ? new Date(happenedAt) : null,
      transcript,
      userId,
    },
  });
  return meeting;
}

async function listMeetings(userId, { page, pageSize }) {
  const prisma = getPrisma();
  const normalizedPage = Number(page);
  const normalizedPageSize = Number(pageSize);
  const skip = (normalizedPage - 1) * normalizedPageSize;

  const [total, items] = await Promise.all([
    prisma.meeting.count({ where: { userId } }),
    prisma.meeting.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: normalizedPageSize,
      select: {
        id: true,
        title: true,
        happenedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    total,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    items,
  };
}

async function getMeeting(userId, meetingId) {
  const prisma = getPrisma();
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId },
    include: {
      analysis: true,
      actionItems: true,
    },
  });
  if (!meeting) throw new AppError('NOT_FOUND', 'Meeting not found', 404);
  return meeting;
}

module.exports = { createMeeting, listMeetings, getMeeting };
