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
  });
  if (!existing) throw new AppError('NOT_FOUND', 'Action item not found', 404);

  const updated = await prisma.actionItem.update({
    where: { id: actionItemId },
    data: { status },
  });

  return updated;
}

async function getActionItem(userId, actionItemId) {
  const prisma = getPrisma();
  const item = await prisma.actionItem.findFirst({
    where: { id: actionItemId, meeting: { userId } },
  });
  if (!item) throw new AppError('NOT_FOUND', 'Action item not found', 404);
  return item;
}

async function listActionItems(userId, { status, assignee, meetingId, page, pageSize }) {
  const prisma = getPrisma();
  const where = {};

  const statusValue = Array.isArray(status) ? status[0] : status;
  const assigneeValue = Array.isArray(assignee) ? assignee[0] : assignee;
  const meetingIdValue = Array.isArray(meetingId) ? meetingId[0] : meetingId;

  if (typeof statusValue === 'string' && statusValue.trim()) where.status = statusValue.trim();
  if (typeof assigneeValue === 'string' && assigneeValue.trim())
    where.assignee = assigneeValue.trim();
  if (typeof meetingIdValue === 'string' && meetingIdValue.trim())
    where.meetingId = meetingIdValue.trim();

  const rawPage = Array.isArray(page) ? page[0] : page;
  const rawPageSize = Array.isArray(pageSize) ? pageSize[0] : pageSize;

  const safePageNumber = Number(rawPage);
  const safePageSizeNumber = Number(rawPageSize);

  const safePage = Number.isFinite(safePageNumber) && safePageNumber >= 1 ? safePageNumber : 1;
  const safePageSize =
    Number.isFinite(safePageSizeNumber) && safePageSizeNumber >= 1 && safePageSizeNumber <= 100
      ? safePageSizeNumber
      : 20;
  const skip = (safePage - 1) * safePageSize;

  const [total, items] = await Promise.all([
    prisma.actionItem.count({ where }),
    prisma.actionItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safePageSize,
    }),
  ]);

  return { total, page: safePage, pageSize: safePageSize, items };
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
  getActionItem,
  listActionItems,
  listOverdue,
  listOverdueForReminders,
};
