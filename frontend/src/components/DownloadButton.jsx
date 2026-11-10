import { useEffect, useRef, useState } from 'react';
import { downloadDocument } from '../services/documents.api.js';

export default function DownloadButton({ document, userId }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function handleDownload() {
    if (downloading) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(document.id, userId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        className="secondary-button"
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Baixar ${document.originalName}`}
        aria-busy={downloading}
      >
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}