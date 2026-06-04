const request = require('supertest');

jest.mock('axios', () => ({ post: jest.fn() }));

const axios = require('axios');
const { app } = require('../src/app');

async function registerAndLogin() {
  const email = `user_${Date.now()}@example.com`;
  const password = 'password123';

  await request(app).post('/api/auth/register').send({ email, password }).expect(201);

  const loginRes = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return { token: loginRes.body.data.token };
}

describe('Analysis', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test';
    axios.post.mockReset();
  });

  test('analyzes a meeting and retries when AI returns invalid JSON', async () => {
    const { token } = await registerAndLogin();

    const createRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Weekly Sync',
        transcript: [
          { timestamp: '00:10', speaker: 'Alice', text: 'We should ship by Friday.' },
          { timestamp: '00:20', speaker: 'Bob', text: 'I will handle the deployment.' },
        ],
      })
      .expect(201);

    const meetingId = createRes.body.data.meeting.id;

    axios.post
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: '```json\n{"not":"valid"\n```' } }] },
      })
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: `\`\`\`json
{
  "summary": "Team aligned on shipping by Friday.",
  "decisions": [{"text":"Ship by Friday","citations":["00:10"]}],
  "followUps": [{"text":"Bob will handle deployment","citations":["00:20"]}],
  "actionItems": [{"task":"Deploy release","assignee":"Bob","dueDate":"2026-06-05","citations":["00:20"]}]
}
\`\`\``,
              },
            },
          ],
        },
      });

    const res = await request(app)
      .post(`/api/meetings/${meetingId}/analyze`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.analysis.summary).toBe('Team aligned on shipping by Friday.');
    expect(res.body.data.createdActionItems.length).toBe(1);
    expect(axios.post).toHaveBeenCalledTimes(2);
  });
});

