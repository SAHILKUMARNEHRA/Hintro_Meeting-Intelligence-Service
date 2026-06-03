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
      requestBody: { required: true },
      responses: { 201: { description: 'Register' } },
    },
  },
  '/api/auth/login': {
    post: {
      security: [],
      requestBody: { required: true },
      responses: { 200: { description: 'Login' } },
    },
  },
  '/api/meetings': {
    post: {
      requestBody: { required: true },
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
      requestBody: { required: true },
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
      requestBody: { required: true },
      responses: { 200: { description: 'Update action item status' } },
    },
  },
};

module.exports = { swaggerUi, swaggerSpec };

