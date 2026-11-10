import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export default function DocumentList({ documents, userId, loading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-heading" aria-busy={loading}>
      <div className="section-heading">
        <h2 id="documents-heading">Seus documentos <span className="document-count">{documents.length}</span></h2>
        <button className="secondary-button" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {loading && <p className="status-message" role="status">Carregando documentos...</p>}
      {documents.length === 0 ? (
        !loading && (
          <p className="empty-state">{error ? 'Lista indisponível.' : 'Nenhum documento encontrado.'}</p>
        )
      ) : (
          <ul className="document-list">
            {documents.map((document) => (
              <li className="document-row" key={document.id}>
                <div className="document-details">
                  <h3>{document.originalName}</h3>
                  <p>
                    <span>{formatSize(document.size)}</span>
                    <time dateTime={document.uploadedAt}>{dateFormatter.format(new Date(document.uploadedAt))}</time>
                  </p>
                </div>
                <DownloadButton document={document} userId={userId} />
              </li>
            ))}
          </ul>
      )}
    </section>
  );
}