import { useEffect, useRef, useState } from 'react';
import { uploadDocument } from '../services/documents.api.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    const form = event.currentTarget;
    const controller = new AbortController();
    requestRef.current = controller;
    setUploading(true);
    setError('');
    setMessage('');

    try {
      const document = await uploadDocument(file, userId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      form.reset();
      setFile(null);
      setMessage(`${document.originalName} enviado com sucesso.`);
      onUploaded(document);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (!controller.signal.aborted) setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-heading">
      <div className="section-heading">
        <h2 id="upload-heading">Enviar documento</h2>
      </div>
      <form className="upload-form" onSubmit={handleSubmit} aria-busy={uploading}>
        <div className="file-field">
          <label htmlFor="document-file">Arquivo</label>
          <input
            id="document-file"
            name="file"
            type="file"
            required
            disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError('');
              setMessage('');
            }}
          />
        </div>
        <button type="submit" disabled={!file || uploading}>
          {uploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="status-message" role="status">{message}</p>
    </section>
  );
}