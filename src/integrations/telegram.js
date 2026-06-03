const axios = require('axios');
const { env } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

async function sendTelegramMessage(text) {
  const token = env.required('TELEGRAM_BOT_TOKEN');
  const chatId = env.required('TELEGRAM_CHAT_ID');
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await axios.post(
      url,
      { chat_id: chatId, text },
      { timeout: 15000 },
    );
    if (!res.data?.ok) throw new Error('Telegram API returned ok=false');
    return { chatId, messageId: res.data.result?.message_id };
  } catch (err) {
    throw new AppError('TELEGRAM_ERROR', 'Failed to send Telegram message', 502);
  }
}

module.exports = { sendTelegramMessage };

