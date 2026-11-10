import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { getUserIdError, listDocuments } from './services/documents.api.js';
import './styles.css';

function DocumentWorkspace({ userId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    listDocuments(userId, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId, revision]);

  function refreshDocuments() {
    setRevision((current) => current + 1);
  }

  return (
    <>
      <UploadComponent userId={userId} onUploaded={refreshDocuments} />
      <DocumentList
        documents={documents}
        userId={userId}
        loading={loading}
        error={error}
        onRefresh={refreshDocuments}
      />
    </>
  );
}

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [userId, setUserId] = useState('');
  const [userError, setUserError] = useState('');

  function handleUserSubmit(event) {
    event.preventDefault();
    const validationError = getUserIdError(userInput);
    setUserError(validationError);
    if (validationError) return;
    const nextUser = userInput.trim();
    if (nextUser) setUserId(nextUser);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="DMS, início">DMS<span className="brand-dot" /></a>
        <span className="header-caption">Document Management System</span>
      </header>
      <main>
        <div className="page-heading">
          <p className="eyebrow">ARQUIVO DIGITAL</p>
          <h1>Documentos</h1>
        </div>
        <section className="user-section" aria-labelledby="user-heading">
          <h2 id="user-heading">Usuário</h2>
          <form className="user-form" onSubmit={handleUserSubmit}>
            <label htmlFor="user-id">Identificador do usuário</label>
            <div className="user-controls">
              <input
                id="user-id"
                name="userId"
                autoComplete="username"
                placeholder="Ex.: alice"
                value={userInput}
                aria-invalid={Boolean(userError)}
                aria-describedby={userError ? 'user-error' : undefined}
                onChange={(event) => {
                  setUserInput(event.target.value);
                  setUserError('');
                }}
                required
              />
              <button type="submit" disabled={!userInput.trim() || userInput.trim() === userId}>
                Abrir documentos
              </button>
            </div>
          </form>
          {userError && <p id="user-error" className="error-message" role="alert">{userError}</p>}
          {userId && <p className="active-user">Usuário atual: <strong>{userId}</strong></p>}
        </section>
        {userId && <DocumentWorkspace key={userId} userId={userId} />}
      </main>
      <footer>DMS <span>Gestão de documentos</span></footer>
    </div>
  );
}
