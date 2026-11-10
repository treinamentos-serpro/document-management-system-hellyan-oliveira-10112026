const { randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const controller = require('../controllers/documents.controller');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);
const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);

if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      mkdir(storageDirectory, { recursive: true }, (error) => {
        callback(error, storageDirectory);
      });
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),
  limits: { fileSize: maxFileSize, files: 1 },
});

const router = express.Router();

router.post('/upload', controller.requireUser, upload.single('file'), controller.upload);
router.get('/documents', controller.requireUser, controller.list);
router.get('/documents/:id/download', controller.requireUser, controller.download);
router.use(controller.handleError);

module.exports = router;