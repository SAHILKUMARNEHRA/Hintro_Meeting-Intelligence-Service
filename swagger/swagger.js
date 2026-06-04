const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meeting Intelligence Service',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

swaggerSpec.components = swaggerSpec.components || {};
swaggerSpec.components.schemas = {
  RegisterRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
    example: { email: 'you@example.com', password: 'password123' },
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
    example: { email: 'you@example.com', password: 'password123' },
  },
  TranscriptSegment: {
    type: 'object',
    required: ['timestamp', 'text'],
    properties: {
      timestamp: { type: 'string', description: 'mm:ss or hh:mm:ss' },
      speaker: { type: 'string' },
      text: { type: 'string' },
    },
    example: { timestamp: '00:10', speaker: 'Alice', text: 'We should ship by Friday.' },
  },
  CreateMeetingRequest: {
    type: 'object',
    required: ['title', 'transcript'],
    properties: {
      title: { type: 'string' },
      happenedAt: { type: 'string', format: 'date-time' },
      transcript: {
        type: 'array',
        items: { $ref: '#/components/schemas/TranscriptSegment' },
        minItems: 1,
      },
    },
    example: {
      title: 'Weekly Sync',
      transcript: [
        { timestamp: '00:10', speaker: 'Alice', text: 'We should ship by Friday.' },
        { timestamp: '00:20', speaker: 'Bob', text: 'I will handle the deployment.' },
      ],
    },
  },
  CreateActionItemRequest: {
    type: 'object',
    required: ['meetingId', 'task', 'assignee'],
    properties: {
      meetingId: { type: 'string', format: 'uuid' },
      task: { type: 'string' },
      assignee: { type: 'string' },
      dueDate: { type: 'string', format: 'date-time' },
    },
    example: {
      meetingId: '00000000-0000-0000-0000-000000000000',
      task: 'Send recap',
      assignee: 'Sahil',
      dueDate: '2026-06-10T10:00:00.000Z',
    },
  },
  UpdateActionItemStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      },
    },
    example: { status: 'IN_PROGRESS' },
  },
};

swaggerSpec.paths = {
  '/health': {
    get: {
      security: [],
      responses: { 200: { description: 'Service health' } },
    },
  },
  '/api/evaluation': {
    get: {
      security: [],
      responses: { 200: { description: 'Evaluation metadata' } },
    },
  },
  '/api/auth/register': {
    post: {
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
          },
        },
      },
      responses: { 201: { description: 'Register' } },
    },
  },
  '/api/auth/login': {
    post: {
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
          },
        },
      },
      responses: { 200: { description: 'Login' } },
    },
  },
  '/api/meetings': {
    post: {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateMeetingRequest' },
          },
        },
      },
      responses: { 201: { description: 'Create meeting' } },
    },
    get: {
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { 200: { description: 'List meetings' } },
    },
  },
  '/api/meetings/{id}': {
    get: {
      parameters: [{ name: 'id', in: 'path', required: true }],
      responses: { 200: { description: 'Get meeting' } },
    },
  },
  '/api/meetings/{id}/analyze': {
    post: {
      parameters: [{ name: 'id', in: 'path', required: true }],
      responses: { 200: { description: 'Analyze meeting transcript' } },
    },
  },
  '/api/action-items': {
    post: {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateActionItemRequest' },
          },
        },
      },
      responses: { 201: { description: 'Create action item' } },
    },
    get: {
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'assignee', in: 'query', schema: { type: 'string' } },
        { name: 'meetingId', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'List action items' } },
    },
  },
  '/api/action-items/overdue': {
    get: {
      responses: { 200: { description: 'List overdue action items' } },
    },
  },
  '/api/action-items/{id}/status': {
    patch: {
      parameters: [{ name: 'id', in: 'path', required: true }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateActionItemStatusRequest' },
          },
        },
      },
      responses: { 200: { description: 'Update action item status' } },
    },
  },
};

module.exports = { swaggerUi, swaggerSpec };
