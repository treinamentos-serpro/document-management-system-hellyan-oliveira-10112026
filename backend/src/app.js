const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');
const documentsRouter = require('./routes/documents.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.get('/openapi.json', (req, res) => {
  res.json(openapi);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
  swaggerOptions: { url: '/openapi.json' },
}));
app.use(documentsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
