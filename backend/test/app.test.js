const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { mkdtempSync, readdirSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const storageDirectory = mkdtempSync(path.join(tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '1024';
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(storageDirectory, { recursive: true, force: true });
});

function uploadFile(owner, content = 'conteudo do documento', field = 'file') {
  const form = new FormData();
  form.append(field, new Blob([content], { type: 'text/plain' }), 'relatorio.txt');
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: owner ? { 'X-User-Id': owner } : {},
    body: form,
  });
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('mantem o endpoint de saude', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { status: 'ok' });
});

test('publica OpenAPI gerado das anotacoes com contratos e referencias validas', async () => {
  const response = await fetch(`${baseUrl}/openapi.json`);
  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const specification = await response.json();
  assert.strictEqual(specification.openapi, '3.0.3');
  assert.deepStrictEqual(Object.keys(specification.paths).sort(), [
    '/documents', '/documents/{id}/download', '/health', '/upload',
  ]);
  assert.strictEqual(specification.components.parameters.UserId.required, true);
  assert.strictEqual(specification.components.parameters.UserId.name, 'X-User-Id');
  assert.deepStrictEqual(Object.keys(specification.components.schemas.Document.properties).sort(),
    ['id', 'originalName', 'owner', 'size', 'uploadedAt']);

  const upload = specification.paths['/upload'].post;
  assert.strictEqual(upload.requestBody.content['multipart/form-data'].schema.properties.file.format, 'binary');
  assert.deepStrictEqual(Object.keys(upload.responses).sort(), ['201', '400', '413', '500']);
  assert.strictEqual(specification.paths['/documents'].get.responses['200'].content['application/json'].schema.type, 'array');
  const download = specification.paths['/documents/{id}/download'].get;
  assert.strictEqual(download.parameters[1].in, 'path');
  assert.strictEqual(download.responses['200'].content['application/octet-stream'].schema.format, 'binary');
  assert.ok(download.responses['404']);

  function checkReferences(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) {
      assert.ok(value.$ref.startsWith('#/'));
      const target = value.$ref.slice(2).split('/').reduce((current, key) => current?.[key], specification);
      assert.ok(target, `Referencia nao encontrada: ${value.$ref}`);
    }
    Object.values(value).forEach(checkReferences);
  }
  checkReferences(specification);
});

test('serve Swagger UI e seus assets sem exigir usuario', async () => {
  const response = await fetch(`${baseUrl}/api-docs/`);
  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /swagger-ui/);

  const script = await fetch(`${baseUrl}/api-docs/swagger-ui-init.js`);
  assert.strictEqual(script.status, 200);
  assert.match(await script.text(), /\/openapi\.json/);

  const stylesheet = await fetch(`${baseUrl}/api-docs/swagger-ui.css`);
  assert.strictEqual(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type'), /text\/css/);
});

test('exige usuario antes de gravar uploads e consultar documentos', async () => {
  const filesBefore = readdirSync(storageDirectory);
  const uploadResponse = await uploadFile();
  assert.strictEqual(uploadResponse.status, 400);
  assert.strictEqual((await uploadResponse.json()).error.code, 'INVALID_REQUEST');
  assert.deepStrictEqual(readdirSync(storageDirectory), filesBefore);

  for (const endpoint of ['/documents', '/documents/inexistente/download']) {
    const response = await fetch(`${baseUrl}${endpoint}`, { headers: { 'X-User-Id': ' ' } });
    assert.strictEqual(response.status, 400);
  }
});

test('grava em disco, lista metadados publicos e baixa os mesmos bytes', async () => {
  const content = Buffer.from([0, 1, 2, 127, 128, 255]);
  const response = await uploadFile('alice', content);
  assert.strictEqual(response.status, 201);
  const document = await response.json();
  assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
  assert.match(document.id, /^[0-9a-f-]{36}$/);
  assert.strictEqual(document.originalName, 'relatorio.txt');
  assert.strictEqual(document.owner, 'alice');
  assert.strictEqual(document.size, content.length);
  assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);

  const files = readdirSync(storageDirectory);
  assert.strictEqual(files.length, 1);
  assert.notStrictEqual(files[0], document.originalName);
  assert.deepStrictEqual(readFileSync(path.join(storageDirectory, files[0])), content);

  const listing = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'alice' } });
  assert.strictEqual(listing.status, 200);
  assert.deepStrictEqual(await listing.json(), [document]);

  const download = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'alice' },
  });
  assert.strictEqual(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /attachment;.*relatorio\.txt/);
  assert.deepStrictEqual(Buffer.from(await download.arrayBuffer()), content);
});

test('isola documentos por usuario e ordena os mais recentes primeiro', async () => {
  const first = await (await uploadFile('bob', 'primeiro')).json();
  const second = await (await uploadFile('bob', 'segundo')).json();
  assert.notStrictEqual(first.id, second.id);
  const response = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'bob' } });
  assert.deepStrictEqual(await response.json(), [second, first]);
  const empty = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'carol' } });
  assert.deepStrictEqual(await empty.json(), []);

  for (const id of [first.id, 'inexistente']) {
    const download = await fetch(`${baseUrl}/documents/${id}/download`, {
      headers: { 'X-User-Id': 'carol' },
    });
    assert.strictEqual(download.status, 404);
    assert.strictEqual((await download.json()).error.code, 'DOCUMENT_NOT_FOUND');
  }
});

test('rejeita arquivo ausente, campo errado, multiplos arquivos e tamanho excedido', async () => {
  const filesBefore = readdirSync(storageDirectory).sort();
  const missing = await fetch(`${baseUrl}/upload`, {
    method: 'POST', headers: { 'X-User-Id': 'alice' }, body: new FormData(),
  });
  assert.strictEqual(missing.status, 400);
  assert.strictEqual((await missing.json()).error.code, 'INVALID_REQUEST');

  const wrongField = await uploadFile('alice', 'conteudo', 'document');
  assert.strictEqual(wrongField.status, 400);
  const multiple = new FormData();
  multiple.append('file', new Blob(['primeiro']), 'primeiro.txt');
  multiple.append('file', new Blob(['segundo']), 'segundo.txt');
  const multipleResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST', headers: { 'X-User-Id': 'alice' }, body: multiple,
  });
  assert.strictEqual(multipleResponse.status, 400);

  const extraField = new FormData();
  extraField.append('file', new Blob(['conteudo']), 'documento.txt');
  extraField.append('unexpected', 'valor');
  const extraFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST', headers: { 'X-User-Id': 'alice' }, body: extraField,
  });
  assert.strictEqual(extraFieldResponse.status, 400);

  const oversized = await uploadFile('alice', Buffer.alloc(1025));
  assert.strictEqual(oversized.status, 413);
  assert.strictEqual((await oversized.json()).error.code, 'FILE_TOO_LARGE');
  assert.deepStrictEqual(readdirSync(storageDirectory).sort(), filesBefore);
});

test('trata arquivo removido e falha de gravacao sem expor caminhos internos', async () => {
  const document = await (await uploadFile('removed')).json();
  rmSync(storageDirectory, { recursive: true });
  const response = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'removed' },
  });
  assert.strictEqual(response.status, 404);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento nao encontrado.' },
  });

  const { writeFileSync } = require('node:fs');
  writeFileSync(storageDirectory, 'nao e um diretorio');
  const failedUpload = await uploadFile('alice');
  assert.strictEqual(failedUpload.status, 500);
  assert.deepStrictEqual(await failedUpload.json(), {
    error: { code: 'INTERNAL_ERROR', message: 'Nao foi possivel concluir a operacao.' },
  });
});
