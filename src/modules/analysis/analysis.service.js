const axios = require('axios');
const { z } = require('zod');

const { env } = require('../../config/env');
const { getPrisma } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const insightSchema = z.object({
  text: z.string().min(1),
  citations: z.array(z.string().min(1)).min(1),
});

const dueDateSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
]);

const aiOutputSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(insightSchema),
  followUps: z.array(insightSchema),
  actionItems: z.array(
    z.object({
      task: z.string().min(1),
      assignee: z.string().min(1),
      dueDate: dueDateSchema.optional(),
      citations: z.array(z.string().min(1)).min(1),
    }),
  ),
});

function transcriptToPrompt(transcript) {
  return transcript
    .map((s) => {
      const speaker = s.speaker ? `${s.speaker}: ` : '';
      return `[${s.timestamp}] ${speaker}${s.text}`;
    })
    .join('\n');
}

function validateCitations(transcript, output) {
  const allowed = new Set(transcript.map((t) => t.timestamp));
  const allCitationLists = [
    ...output.decisions.map((d) => d.citations),
    ...output.followUps.map((f) => f.citations),
    ...output.actionItems.map((a) => a.citations),
  ];

  for (const citations of allCitationLists) {
    for (const ts of citations) {
      if (!allowed.has(ts)) {
        throw new AppError(
          'AI_OUTPUT_INVALID',
          `Invalid citation timestamp returned by AI: ${ts}`,
          502,
        );
      }
    }
  }
}

function sanitizeModelJson(rawContent) {
  let s = String(rawContent || '');
  s = s.replace(/```json/gi, '```');
  s = s.replace(/```/g, '');
  s = s.trim();

  if (!s) return s;
  if (s.startsWith('{') && s.endsWith('}')) return s;

  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return s.slice(first, last + 1);
  }

  return s;
}

function normalizeParsedOutput(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;

  const out = { ...parsed };

  if (!Array.isArray(out.decisions)) out.decisions = [];
  if (!Array.isArray(out.followUps)) out.followUps = [];
  if (!Array.isArray(out.actionItems)) out.actionItems = [];

  out.actionItems = out.actionItems.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const next = { ...item };

    if (
      typeof next.dueDate !== 'string' ||
      next.dueDate.trim() === '' ||
      Number.isNaN(Date.parse(next.dueDate))
    ) {
      delete next.dueDate;
    }

    return next;
  });

  return out;
}

function buildRequestPayload(model, prompt) {
  return {
    model,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content:
          'You are an accurate meeting analyst. You must only use the provided transcript lines. If something is not explicitly present, omit it. You must never invent details. You must respond with ONLY raw JSON that parses with JSON.parse. Do not use markdown, code fences, backticks, or any explanatory text.',
      },
      { role: 'user', content: prompt },
    ],
  };
}

async function postGroq({ model, prompt, apiKey }) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  return axios.post(url, buildRequestPayload(model, prompt), {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 30000,
  });
}

async function callGroq({ prompt }) {
  const apiKey = env.required('GROQ_API_KEY');
  const preferredModel = env.GROQ_MODEL || 'llama3-8b-8192';

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response;
    try {
      response = await postGroq({ model: preferredModel, prompt, apiKey });
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error?.code || err?.response?.data?.code;
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Groq request failed';

      const isDecommissioned =
        String(code || '').toLowerCase().includes('decommissioned') ||
        String(message).toLowerCase().includes('decommissioned');

      if (status === 400 && isDecommissioned) {
        try {
          response = await postGroq({
            model: 'llama-3.1-8b-instant',
            prompt,
            apiKey,
          });
        } catch (retryErr) {
          lastError = retryErr;
          break;
        }
      } else {
        lastError = err;
        break;
      }
    }

    const content = response?.data?.choices?.[0]?.message?.content;
    if (!content) {
      lastError = new AppError('AI_ERROR', 'Empty AI response', 502);
      continue;
    }

    let parsed;
    try {
      const cleaned = sanitizeModelJson(content);
      parsed = normalizeParsedOutput(JSON.parse(cleaned));
    } catch (err) {
      lastError = err;
      continue;
    }

    const validated = aiOutputSchema.safeParse(parsed);
    if (!validated.success) {
      lastError = validated.error;
      continue;
    }

    return validated.data;
  }

  const status = lastError?.response?.status;
  const message =
    lastError?.response?.data?.error?.message ||
    lastError?.response?.data?.message ||
    lastError?.message ||
    'Groq request failed';

  if (status) {
    throw new AppError('AI_ERROR', `Groq request failed (${status}): ${message}`, 502);
  }
  throw new AppError('AI_OUTPUT_INVALID', 'AI output did not match schema', 502);
}

async function analyzeMeeting(userId, meetingId) {
  const prisma = getPrisma();
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId },
  });
  if (!meeting) throw new AppError('NOT_FOUND', 'Meeting not found', 404);

  const transcript = Array.isArray(meeting.transcript) ? meeting.transcript : [];
  if (!transcript.length) {
    throw new AppError('VALIDATION_ERROR', 'Meeting transcript is empty', 400);
  }

  const transcriptText = transcriptToPrompt(transcript);
  const allowedTimestamps = transcript.map((t) => t.timestamp).join(', ');

  const prompt = [
    'Return ONLY a single raw JSON object.',
    'Do NOT include markdown.',
    'Do NOT include backticks.',
    'Do NOT include code fences like ``` or ```json.',
    'Do NOT include any explanation or preamble.',
    'Do NOT include any trailing text after the JSON object.',
    'The output must start with "{" and end with "}".',
    'All keys must be present. If a list has no items, return an empty array.',
    '',
    'Transcript (each line includes an authoritative timestamp in brackets):',
    transcriptText,
    '',
    'Allowed citation timestamps:',
    allowedTimestamps,
    '',
    'Task:',
    'Return a single JSON object that strictly follows this schema:',
    '{',
    '  "summary": "string",',
    '  "decisions": [{"text":"string","citations":["mm:ss"]}],',
    '  "followUps": [{"text":"string","citations":["mm:ss"]}],',
    '  "actionItems": [{"task":"string","assignee":"string","dueDate":"ISO-8601 date or datetime optional","citations":["mm:ss"]}]',
    '}',
    '',
    'Rules:',
    '- Use ONLY information from the transcript lines.',
    '- "decisions", "followUps", and "actionItems" must always be arrays (possibly empty).',
    '- Every entry MUST include at least 1 citation timestamp from the allowed list.',
    '- Citations must be exact timestamp strings (e.g. "12:34").',
    '- "assignee" must be a non-empty string. If unknown, use "Unassigned".',
    '- "dueDate" must be an ISO-8601 date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:mm:ssZ). If unknown, omit the field.',
    '- If an item cannot be supported by transcript content, omit it.',
    '- Do not include any extra keys.',
  ].join('\n');

  const output = await callGroq({ prompt });
  validateCitations(transcript, output);

  const result = await prisma.$transaction(async (tx) => {
    const analysis = await tx.analysis.upsert({
      where: { meetingId: meeting.id },
      update: {
        summary: output.summary,
        decisions: output.decisions,
        followUps: output.followUps,
      },
      create: {
        meetingId: meeting.id,
        summary: output.summary,
        decisions: output.decisions,
        followUps: output.followUps,
      },
    });

    await tx.actionItem.deleteMany({ where: { meetingId: meeting.id, source: 'AI' } });

    const createdActionItems = await Promise.all(
      output.actionItems.map((item) =>
        tx.actionItem.create({
          data: {
            meetingId: meeting.id,
            task: item.task,
            assignee: item.assignee,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            status: 'PENDING',
            source: 'AI',
            citations: item.citations,
          },
        }),
      ),
    );

    return { analysis, createdActionItems };
  });

  return result;
}

module.exports = { analyzeMeeting };
