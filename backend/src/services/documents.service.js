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

function buildDocument(file, owner) {
  return {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storedName: file.filename,
    storagePath: file.path,
    mimeType: file.mimetype,
  };
}

function createDocument(file, owner) {
  return toPublicDocument(repository.save(buildDocument(file, owner)));
}

function listDocuments(owner) {
  return repository.findByOwner(owner).map(toPublicDocument);
}

function createNotFoundError() {
  const error = new Error('Documento nao encontrado.');
  error.status = 404;
  error.code = 'DOCUMENT_NOT_FOUND';
  return error;
}

function getDocument(id, owner) {
  const document = repository.findById(id);
  if (!document || document.owner !== owner) throw createNotFoundError();
  return document;
}

module.exports = { createDocument, listDocuments, getDocument };