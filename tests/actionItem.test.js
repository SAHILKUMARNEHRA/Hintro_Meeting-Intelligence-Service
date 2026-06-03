const request = require('supertest');
const { app } = require('../src/app');

async function authUser() {
  const email = `user_${Date.now()}@example.com`;
  const password = 'password123';
  await request(app).post('/api/auth/register').send({ email, password }).expect(201);
  const loginRes = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return { token: loginRes.body.data.token };
}

async function createMeeting(token) {
  const res = await request(app)
    .post('/api/meetings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Planning',
      transcript: [{ timestamp: '01:00', text: 'Let us plan tasks.' }],
    })
    .expect(201);
  return res.body.data.meeting.id;
}

describe('Action Items', () => {
  test('creates an overdue action item and lists it', async () => {
    const { token } = await authUser();
    const meetingId = await createMeeting(token);

    const dueDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/action-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ meetingId, task: 'Send follow up email', assignee: 'Sahil', dueDate })
      .expect(201);

    const itemId = createRes.body.data.actionItem.id;

    const overdueRes = await request(app)
      .get('/api/action-items/overdue')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(overdueRes.body.data.items.length).toBe(1);
    expect(overdueRes.body.data.items[0].id).toBe(itemId);

    await request(app)
      .patch(`/api/action-items/${itemId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    const overdueRes2 = await request(app)
      .get('/api/action-items/overdue')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(overdueRes2.body.data.items.length).toBe(0);
  });
});

