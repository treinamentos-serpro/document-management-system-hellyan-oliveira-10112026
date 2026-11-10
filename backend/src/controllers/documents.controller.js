const service = require('../services/documents.service');

/**
 * @openapi
 * components:
 *   parameters:
 *     UserId:
 *       in: header
 *       name: X-User-Id
 *       required: true
 *       description: Identidade declarada pelo cliente. Nao comprova autenticacao. Nao pode conter apenas espacos.
 *       schema:
 *         type: string
 *         minLength: 1
 *         pattern: '\S'
 *       example: alice
 *   schemas:
 *     Document:
 *       type: object
 *       additionalProperties: false
 *       required: [id, originalName, size, uploadedAt, owner]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         originalName:
 *           type: string
 *           example: relatorio.pdf
 *         size:
 *           type: integer
 *           minimum: 0
 *           description: Tamanho do arquivo em bytes.
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         owner:
 *           type: string
 *           example: alice
 *     Error:
 *       type: object
 *       required: [error]
 *       properties:
 *         error:
 *           type: object
 *           required: [code, message]
 *           properties:
 *             code:
 *               type: string
 *               enum: [INVALID_REQUEST, FILE_TOO_LARGE, DOCUMENT_NOT_FOUND, INTERNAL_ERROR]
 *             message:
 *               type: string
 *   responses:
 *     InvalidRequest:
 *       description: X-User-Id ausente ou vazio, arquivo ausente ou upload invalido.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             error:
 *               code: INVALID_REQUEST
 *               message: Informe o cabecalho X-User-Id.
 *     FileTooLarge:
 *       description: Arquivo excede MAX_FILE_SIZE_BYTES (padrao de 10 MiB).
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             error:
 *               code: FILE_TOO_LARGE
 *               message: O arquivo excede o tamanho permitido.
 *     DocumentNotFound:
 *       description: Documento inexistente, de outro usuario ou arquivo indisponivel no disco.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             error:
 *               code: DOCUMENT_NOT_FOUND
 *               message: Documento nao encontrado.
 *     InternalError:
 *       description: Falha interna ao processar a operacao.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             error:
 *               code: INTERNAL_ERROR
 *               message: Nao foi possivel concluir a operacao.
 */
function requireUser(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'Informe o cabecalho X-User-Id.' },
    });
  }
  res.locals.owner = owner;
  next();
}

/**
 * @openapi
 * /upload:
 *   post:
 *     tags: [Documentos]
 *     summary: Envia um documento
 *     operationId: uploadDocument
 *     description: Grava um arquivo localmente e registra seus metadados em memoria. Limite configuravel por MAX_FILE_SIZE_BYTES, com padrao de 10485760 bytes (10 MiB).
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Um unico arquivo por requisicao.
 *     responses:
 *       '201':
 *         description: Documento criado. Caminhos e nomes internos nao sao expostos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       '400':
 *         $ref: '#/components/responses/InvalidRequest'
 *       '413':
 *         $ref: '#/components/responses/FileTooLarge'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'Envie um arquivo no campo file.' },
    });
  }
  res.status(201).json(service.createDocument(req.file, res.locals.owner));
}

/**
 * @openapi
 * /documents:
 *   get:
 *     tags: [Documentos]
 *     summary: Lista os documentos do usuario
 *     operationId: listDocuments
 *     description: Retorna somente os documentos do usuario, do mais recente para o mais antigo. Retorna uma lista vazia quando nao ha documentos.
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       '200':
 *         description: Metadados publicos dos documentos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       '400':
 *         $ref: '#/components/responses/InvalidRequest'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
function list(req, res) {
  res.json(service.listDocuments(res.locals.owner));
}

/**
 * @openapi
 * /documents/{id}/download:
 *   get:
 *     tags: [Documentos]
 *     summary: Baixa um documento do usuario
 *     operationId: downloadDocument
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador do documento retornado pelo upload ou listagem.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Conteudo do arquivo. O Content-Type varia conforme o arquivo.
 *         headers:
 *           Content-Disposition:
 *             description: Anexo com o nome original do arquivo.
 *             schema:
 *               type: string
 *               example: attachment; filename="relatorio.pdf"
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       '400':
 *         $ref: '#/components/responses/InvalidRequest'
 *       '404':
 *         $ref: '#/components/responses/DocumentNotFound'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
function download(req, res, next) {
  const document = service.getDocument(req.params.id, res.locals.owner);
  res.download(document.storagePath, document.originalName, (error) => {
    if (error) next(error);
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o tamanho permitido.' },
    });
  }

  if (error.code?.startsWith('LIMIT_') || error.message === 'Unexpected end of form'
    || error.message === 'Multipart: Boundary not found') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'Upload invalido. Envie um arquivo no campo file.' },
    });
  }

  if (error.status === 404 || error.code === 'ENOENT') {
    return res.status(404).json({
      error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento nao encontrado.' },
    });
  }

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Nao foi possivel concluir a operacao.' },
  });
}

module.exports = { requireUser, upload, list, download, handleError };