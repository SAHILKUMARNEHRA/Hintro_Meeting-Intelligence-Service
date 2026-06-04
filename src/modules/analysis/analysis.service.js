const axios = require('axios');
const { z } = require('zod');

const { env } = require('../../config/env');
const { getPrisma } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const insightSchema = z.object({
  text: z.string().min(1),
  citations: z.array(z.string().min(1)).min(1),
});

const aiOutputSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(insightSchema),
  followUps: z.array(insightSchema),
  actionItems: z.array(
    z.object({
      task: z.string().min(1),
      assignee: z.string().min(1),
      dueDate: z.string().datetime().optional(),
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

async function callGroq({ prompt }) {
  const apiKey = env.required('GROQ_API_KEY');
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  let response;
  try {
    const model = env.GROQ_MODEL || 'llama3-8b-8192';
    response = await axios.post(
      url,
      {
        model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are an accurate meeting analyst. You must only use the provided transcript lines. If something is not explicitly present, omit it. You must never invent details.',
          },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 30000,
      },
    );
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
        response = await axios.post(
          url,
          {
            model: 'llama-3.1-8b-instant',
            temperature: 0,
            messages: [
              {
                role: 'system',
                content:
                  'You are an accurate meeting analyst. You must only use the provided transcript lines. If something is not explicitly present, omit it. You must never invent details.',
              },
              { role: 'user', content: prompt },
            ],
          },
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 30000,
          },
        );
      } catch (retryErr) {
        const retryStatus = retryErr?.response?.status;
        const retryMessage =
          retryErr?.response?.data?.error?.message ||
          retryErr?.response?.data?.message ||
          retryErr?.message ||
          'Groq request failed';
        throw new AppError(
          'AI_ERROR',
          `Groq request failed (${retryStatus ?? 'unknown'}): ${retryMessage}`,
          502,
        );
      }
    } else {
      throw new AppError(
        'AI_ERROR',
        `Groq request failed (${status ?? 'unknown'}): ${message}`,
        502,
      );
    }
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new AppError('AI_ERROR', 'Empty AI response', 502);

  let parsed;
  try {
    const raw = String(content).trim();
    const candidate = raw.startsWith('{')
      ? raw
      : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    parsed = JSON.parse(candidate);
  } catch (err) {
    throw new AppError('AI_ERROR', 'AI returned non-JSON output', 502);
  }

  const validated = aiOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AppError('AI_OUTPUT_INVALID', 'AI output did not match schema', 502);
  }

  return validated.data;
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
    '  "actionItems": [{"task":"string","assignee":"string","dueDate":"ISO-8601 optional","citations":["mm:ss"]}]',
    '}',
    '',
    'Rules:',
    '- Use ONLY information from the transcript lines.',
    '- Every entry MUST include at least 1 citation timestamp from the allowed list.',
    '- Citations must be exact timestamp strings (e.g. "12:34").',
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
