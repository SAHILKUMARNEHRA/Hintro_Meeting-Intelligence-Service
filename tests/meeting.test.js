const request = require('supertest');
const { app } = require('../src/app');

async function registerAndLogin() {
  const email = `user_${Date.now()}@example.com`;
  const password = 'password123';

  await request(app).post('/api/auth/register').send({ email, password }).expect(201);

  const loginRes = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return { token: loginRes.body.data.token };
}

describe('Meetings', () => {
  test('creates, lists, and gets a meeting', async () => {
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

    const listRes = await request(app)
      .get('/api/meetings?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.data.total).toBe(1);
    expect(listRes.body.data.items[0].id).toBe(meetingId);

    const getRes = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.data.meeting.id).toBe(meetingId);
    expect(Array.isArray(getRes.body.data.meeting.transcript)).toBe(true);
  });
});

