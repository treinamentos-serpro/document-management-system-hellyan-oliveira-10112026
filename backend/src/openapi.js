const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');
const { version } = require('../package.json');

module.exports = swaggerJsdoc({
  failOnErrors: true,
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Document Management System API',
      version,
      description: 'API de documentos com arquivos locais e metadados em memoria. '
        + 'X-User-Id e uma identidade declarada pelo cliente, nao autenticacao. '
        + 'Os metadados sao perdidos ao reiniciar o servidor.',
    },
    servers: [{ url: '/', description: 'Servidor atual do backend' }],
    tags: [{ name: 'Documentos' }, { name: 'Saude' }],
    paths: {
      '/health': {
        get: {
          tags: ['Saude'],
          summary: 'Verifica a saude do backend',
          operationId: 'getHealth',
          responses: {
            200: {
              description: 'Backend disponivel.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status'],
                    properties: { status: { type: 'string', enum: ['ok'] } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, 'controllers/documents.controller.js')],
});