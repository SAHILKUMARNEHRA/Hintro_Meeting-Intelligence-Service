const cron = require('node-cron');

const { getPrisma } = require('../config/db');
const { sendTelegramMessage } = require('../integrations/telegram');
const { listOverdueForReminders } = require('../modules/actionItems/actionItem.service');
const { log } = require('../utils/logger');

function formatReminderMessage(item) {
  const due = item.dueDate ? item.dueDate.toISOString() : 'N/A';
  return `⚠️ Reminder: ${item.task}\nAssigned To: ${item.assignee}\nDue Date: ${due}`;
}

async function runReminderCycle() {
  const prisma = getPrisma();
  const overdue = await listOverdueForReminders();
  if (!overdue.length) return;

  const cutoff = new Date(Date.now() - 55 * 60 * 1000);

  for (const item of overdue) {
    const lastReminder = await prisma.reminderHistory.findFirst({
      where: { actionItemId: item.id },
      orderBy: { sentAt: 'desc' },
    });
    if (lastReminder && lastReminder.sentAt > cutoff) continue;

    const message = formatReminderMessage(item);
    const result = await sendTelegramMessage(message);
    await prisma.reminderHistory.create({
      data: {
        actionItemId: item.id,
        telegramChatId: result.chatId,
        message,
      },
    });
  }
}

function startReminderJob() {
  const timezone = process.env.TZ;
  const options = timezone ? { timezone } : {};
  cron.schedule(
    '0 * * * *',
    () => {
      runReminderCycle().catch((err) =>
        log('error', { traceId: 'cron', error: { message: err.message, stack: err.stack } }),
      );
    },
    options,
  );
}

module.exports = { startReminderJob, runReminderCycle };
