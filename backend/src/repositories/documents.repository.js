const documents = new Map();

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .reverse()
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
}

function findById(id) {
  return documents.get(id);
}

module.exports = { save, findByOwner, findById };