import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../src/App.jsx';
import DownloadButton from '../src/components/DownloadButton.jsx';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/documents.api.js';

vi.mock('../src/services/documents.api.js', async (importOriginal) => ({
  ...await importOriginal(),
  listDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  downloadDocument: vi.fn(),
}));

const aliceDocument = {
  id: 'alice-document', originalName: 'contrato.txt', size: 8,
  uploadedAt: '2026-11-10T12:00:00Z', owner: 'alice',
};
const bobDocument = { ...aliceDocument, id: 'bob-document', originalName: 'recibo.txt', owner: 'bob' };

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function selectUser(userId) {
  fireEvent.change(screen.getByLabelText('Identificador do usuário'), { target: { value: userId } });
  fireEvent.submit(screen.getByRole('button', { name: 'Abrir documentos' }).closest('form'));
}

function selectFile() {
  const file = new File(['conteudo'], 'novo.txt', { type: 'text/plain' });
  fireEvent.change(screen.getByLabelText('Arquivo'), { target: { files: [file] } });
  fireEvent.submit(screen.getByRole('button', { name: 'Enviar documento' }).closest('form'));
  return file;
}

beforeEach(() => {
  listDocuments.mockReset().mockResolvedValue([]);
  uploadDocument.mockReset().mockResolvedValue({ ...aliceDocument, id: 'new-document', originalName: 'novo.txt' });
  downloadDocument.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test.each(['manual', 'upload'])('preserva download durante atualizacao por %s', async (source) => {
  const refresh = deferred();
  const download = deferred();
  listDocuments.mockResolvedValueOnce([aliceDocument]).mockReturnValueOnce(refresh.promise);
  downloadDocument.mockReturnValueOnce(download.promise);
  render(<App />);
  selectUser('alice');
  await screen.findByRole('heading', { name: 'contrato.txt' });
  fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato.txt' }));
  const signal = downloadDocument.mock.calls[0][2].signal;

  if (source === 'manual') fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  else selectFile();

  await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
  expect(signal.aborted).toBe(false);
  expect(screen.getByRole('heading', { name: 'contrato.txt' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Baixar contrato.txt' }).textContent).toBe('Baixando...');

  await act(async () => refresh.resolve([aliceDocument]));
  expect(signal.aborted).toBe(false);
  expect(screen.getByRole('button', { name: 'Baixar contrato.txt' }).disabled).toBe(true);
});

test('troca de usuario aborta a listagem e ignora uma resposta antiga', async () => {
  const oldList = deferred();
  listDocuments.mockReturnValueOnce(oldList.promise).mockResolvedValueOnce([bobDocument]);
  render(<App />);
  selectUser('alice');
  const oldSignal = listDocuments.mock.calls[0][1].signal;
  selectUser('bob');
  expect(oldSignal.aborted).toBe(true);
  await screen.findByRole('heading', { name: 'recibo.txt' });

  await act(async () => oldList.resolve([aliceDocument]));
  expect(screen.queryByRole('heading', { name: 'contrato.txt' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'recibo.txt' })).toBeTruthy();
  expect(listDocuments.mock.calls[1][0]).toBe('bob');
});

test('troca de usuario limpa a lista e cancela upload e download sem efeitos atrasados', async () => {
  const upload = deferred();
  const download = deferred();
  const bobList = deferred();
  listDocuments.mockResolvedValueOnce([aliceDocument]).mockReturnValueOnce(bobList.promise);
  uploadDocument.mockReturnValueOnce(upload.promise);
  downloadDocument.mockReturnValueOnce(download.promise);
  render(<App />);
  selectUser('alice');
  await screen.findByRole('heading', { name: 'contrato.txt' });
  fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato.txt' }));
  selectFile();
  const uploadSignal = uploadDocument.mock.calls[0][2].signal;
  const downloadSignal = downloadDocument.mock.calls[0][2].signal;

  selectUser('bob');
  expect(uploadSignal.aborted).toBe(true);
  expect(downloadSignal.aborted).toBe(true);
  expect(screen.queryByRole('heading', { name: 'contrato.txt' })).toBeNull();

  await act(async () => {
    upload.resolve(aliceDocument);
    download.resolve(new Blob(['conteudo']));
    bobList.resolve([bobDocument]);
  });
  expect(screen.getByRole('heading', { name: 'recibo.txt' })).toBeTruthy();
  expect(screen.queryByText(/enviado com sucesso/)).toBeNull();
  expect(listDocuments).toHaveBeenCalledTimes(2);
});

test('upload concluido atualiza a lista e limpa a selecao', async () => {
  const upload = deferred();
  const newDocument = { ...aliceDocument, id: 'new-document', originalName: 'novo.txt' };
  listDocuments.mockResolvedValueOnce([]).mockResolvedValueOnce([newDocument]);
  uploadDocument.mockReturnValueOnce(upload.promise);
  render(<App />);
  selectUser('alice');
  await screen.findByText('Nenhum documento encontrado.');
  const file = selectFile();
  expect(uploadDocument.mock.calls[0].slice(0, 2)).toEqual([file, 'alice']);
  expect(screen.getByLabelText('Arquivo').disabled).toBe(true);

  await act(async () => upload.resolve(newDocument));
  expect(await screen.findByRole('heading', { name: 'novo.txt' })).toBeTruthy();
  expect(screen.getByText('novo.txt enviado com sucesso.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Enviar documento' }).disabled).toBe(true);
  expect(screen.getByLabelText('Arquivo').disabled).toBe(false);
});

test('erro de upload permite tentar novamente sem atualizar a lista prematuramente', async () => {
  uploadDocument.mockRejectedValueOnce(new Error('Arquivo muito grande.'));
  render(<App />);
  selectUser('alice');
  await screen.findByText('Nenhum documento encontrado.');
  selectFile();
  expect((await screen.findByRole('alert')).textContent).toBe('Arquivo muito grande.');
  expect(listDocuments).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Enviar documento' }).disabled).toBe(false);

  fireEvent.submit(screen.getByRole('button', { name: 'Enviar documento' }).closest('form'));
  await screen.findByText('novo.txt enviado com sucesso.');
  expect(uploadDocument).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
});

test('identificador invalido mostra erro acessivel e nao inicia requisicoes', async () => {
  render(<App />);
  selectUser('\u674e');
  expect(screen.getByRole('alert').textContent).toContain('Latin-1');
  expect(screen.getByLabelText('Identificador do usuário').getAttribute('aria-invalid')).toBe('true');
  expect(listDocuments).not.toHaveBeenCalled();

  selectUser('jo\u00e3o');
  await screen.findByText('Nenhum documento encontrado.');
  expect(listDocuments.mock.calls[0][0]).toBe('jo\u00e3o');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('download usa o blob e o nome original e libera a URL temporaria', async () => {
  vi.useFakeTimers();
  const blob = new Blob(['conteudo']);
  const createObjectURL = vi.fn(() => 'blob:documento');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadDocument.mockResolvedValueOnce(blob);
  render(<DownloadButton document={aliceDocument} userId="alice" />);

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato.txt' })));
  expect(downloadDocument.mock.calls[0].slice(0, 2)).toEqual([aliceDocument.id, 'alice']);
  expect(createObjectURL).toHaveBeenCalledWith(blob);
  expect(click).toHaveBeenCalledOnce();
  const link = click.mock.instances[0];
  expect(link.download).toBe('contrato.txt');
  expect(link.href).toBe('blob:documento');
  expect(link.isConnected).toBe(false);
  expect(screen.getByRole('button', { name: 'Baixar contrato.txt' }).disabled).toBe(false);
  act(() => vi.advanceTimersByTime(60_000));
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento');
});

test('falha no download exibe o erro e reabilita o botao', async () => {
  downloadDocument.mockRejectedValueOnce(new Error('Documento nao encontrado.'));
  render(<DownloadButton document={aliceDocument} userId="alice" />);
  fireEvent.click(screen.getByRole('button', { name: 'Baixar contrato.txt' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Documento nao encontrado.');
  expect(screen.getByRole('button', { name: 'Baixar contrato.txt' }).disabled).toBe(false);
});

test('falha na listagem permite atualizar e recuperar os documentos', async () => {
  listDocuments.mockRejectedValueOnce(new Error('Backend indisponivel.')).mockResolvedValueOnce([aliceDocument]);
  render(<App />);
  selectUser('alice');
  expect((await screen.findByRole('alert')).textContent).toBe('Backend indisponivel.');
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  expect(await screen.findByRole('heading', { name: 'contrato.txt' })).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});