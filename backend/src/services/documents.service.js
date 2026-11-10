const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documents.repository');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function createDocument(file, owner) {
  const document = repository.save({
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storedName: file.filename,
    storagePath: file.path,
    mimeType: file.mimetype,
  });
  return toPublicDocument(document);
}

function listDocuments(owner) {
  return repository.findByOwner(owner).map(toPublicDocument);
}

function getDocument(id, owner) {
  const document = repository.findById(id);
  if (!document || document.owner !== owner) {
    const error = new Error('Documento nao encontrado.');
    error.status = 404;
    error.code = 'DOCUMENT_NOT_FOUND';
    throw error;
  }
  return document;
}

module.exports = { createDocument, listDocuments, getDocument };