const { getPrisma } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

async function ensureMeetingOwned(tx, userId, meetingId) {
  const meeting = await tx.meeting.findFirst({
    where: { id: meetingId, userId },
    select: { id: true },
  });
  if (!meeting) throw new AppError('NOT_FOUND', 'Meeting not found', 404);
}

async function createActionItem(userId, { meetingId, task, assignee, dueDate }) {
  const prisma = getPrisma();
  const created = await prisma.$transaction(async (tx) => {
    await ensureMeetingOwned(tx, userId, meetingId);
    return tx.actionItem.create({
      data: {
        meetingId,
        task,
        assignee,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
        source: 'MANUAL',
        createdByUserId: userId,
      },
    });
  });
  return created;
}

async function updateStatus(userId, actionItemId, status) {
  const prisma = getPrisma();
  const existing = await prisma.actionItem.findUnique({
    where: { id: actionItemId },
    include: { meeting: { select: { userId: true } } },
  });
  if (!existing) throw new AppError('NOT_FOUND', 'Action item not found', 404);
  if (existing.meeting.userId !== userId) {
    throw new AppError('FORBIDDEN', 'Not allowed', 403);
  }

  const updated = await prisma.actionItem.update({
    where: { id: actionItemId },
    data: { status },
  });

  return updated;
}

async function listActionItems(userId, { status, assignee, meetingId, page, pageSize }) {
  const prisma = getPrisma();
  const where = {
    meeting: { userId },
  };

  if (status) where.status = status;
  if (assignee) where.assignee = assignee;
  if (meetingId) where.meetingId = meetingId;

  const skip = (page - 1) * pageSize;

  const [total, items] = await Promise.all([
    prisma.actionItem.count({ where }),
    prisma.actionItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

async function listOverdue(userId) {
  const prisma = getPrisma();
  const now = new Date();
  const items = await prisma.actionItem.findMany({
    where: {
      meeting: { userId },
      dueDate: { lt: now },
      status: { not: 'COMPLETED' },
    },
    orderBy: { dueDate: 'asc' },
  });
  return items;
}

async function listOverdueForReminders() {
  const prisma = getPrisma();
  const now = new Date();
  const items = await prisma.actionItem.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: 'COMPLETED' },
    },
    include: {
      meeting: { select: { title: true } },
    },
    orderBy: { dueDate: 'asc' },
  });
  return items;
}

module.exports = {
  createActionItem,
  updateStatus,
  listActionItems,
  listOverdue,
  listOverdueForReminders,
};
