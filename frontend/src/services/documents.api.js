export function getUserIdError(userId) {
  if (!userId.trim()) return 'Informe o identificador do usuario.';
  if (/[^\x20-\x7e\xa0-\xff]/u.test(userId)) {
    return 'Use um identificador sem caracteres de controle e apenas com caracteres Latin-1 (por exemplo: alice ou joao).';
  }
  return '';
}

async function request(path, userId, options = {}) {
  const validationError = getUserIdError(userId);
  if (validationError) throw new Error(validationError);

  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'X-User-Id': userId },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Nao foi possivel concluir a operacao. Tente novamente.');
  }

  return response;
}

export async function listDocuments(userId, options = {}) {
  const response = await request('/documents', userId, options);
  return response.json();
}

export async function uploadDocument(file, userId, options = {}) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', userId, { ...options, method: 'POST', body });
  return response.json();
}

export async function downloadDocument(documentId, userId, options = {}) {
  const response = await request(`/documents/${encodeURIComponent(documentId)}/download`, userId, options);
  return response.blob();
}