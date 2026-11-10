import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/documents.api.js';

test('lista documentos via /api com a identidade e o sinal de cancelamento', async (context) => {
  const documents = [{ id: '123', originalName: 'contrato.pdf' }];
  const controller = new AbortController();
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(documents));

  assert.deepEqual(await listDocuments('alice', { signal: controller.signal }), documents);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/documents');
  assert.equal(options.headers['X-User-Id'], 'alice');
  assert.equal(options.signal, controller.signal);
});

test('envia um arquivo no campo file sem definir o boundary manualmente', async (context) => {
  const file = new File(['conteudo'], 'contrato.txt');
  const document = { id: '123', originalName: file.name };
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(document, { status: 201 }));

  assert.deepEqual(await uploadDocument(file, 'alice'), document);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/upload');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['X-User-Id'], 'alice');
  assert.equal(options.headers['Content-Type'], undefined);
  assert.equal(options.body.get('file').name, file.name);
  assert.equal(await options.body.get('file').text(), 'conteudo');
});

test('baixa o conteudo binario com o cabecalho do usuario', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response('conteudo'));

  const blob = await downloadDocument('id/123', 'alice');
  assert.equal(await blob.text(), 'conteudo');
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/documents/id%2F123/download');
  assert.equal(options.headers['X-User-Id'], 'alice');
});

test('propaga a mensagem de erro do backend nas tres operacoes', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { message: 'Documento nao encontrado.' },
  }, { status: 404 }));

  await assert.rejects(listDocuments('alice'), /Documento nao encontrado/);
  await assert.rejects(uploadDocument(new File([''], 'arquivo.txt'), 'alice'), /Documento nao encontrado/);
  await assert.rejects(downloadDocument('123', 'alice'), /Documento nao encontrado/);
});

test('trata respostas de erro sem JSON', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('Bad gateway', { status: 502 }));
  await assert.rejects(listDocuments('alice'), /Nao foi possivel concluir a operacao/);
});

test('rejeita identificadores invalidos antes de chamar fetch nas tres operacoes', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json([]));
  for (const userId of [' ', '\u674e', 'alice\nalice', 'alice\u0000', 'alice\u007f']) {
    await assert.rejects(listDocuments(userId), /identificador/);
    await assert.rejects(uploadDocument(new File([''], 'arquivo.txt'), userId), /identificador/);
    await assert.rejects(downloadDocument('123', userId), /identificador/);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('preserva identificadores Latin-1 suportados pelo backend', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json([]));
  await listDocuments('jo\u00e3o', {});
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers['X-User-Id'], 'jo\u00e3o');
});

test('encaminha o cancelamento de upload e download', async (context) => {
  const controller = new AbortController();
  const fetchMock = context.mock.method(globalThis, 'fetch', async (url, { signal }) => {
    assert.equal(signal, controller.signal);
    signal.throwIfAborted();
  });
  controller.abort();
  await assert.rejects(uploadDocument(new File([''], 'arquivo.txt'), 'alice', { signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(downloadDocument('123', 'alice', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(fetchMock.mock.callCount(), 2);
});