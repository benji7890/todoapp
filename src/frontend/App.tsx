import { useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import TodoApp from './components/TodoApp';
import DocumentUpload from './components/DocumentUpload';
import { trpc } from './utils/trpc';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../shared/documents';

const layoutStyles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f7f7f7',
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #ddd',
    padding: '20px',
    boxSizing: 'border-box' as const,
  },
  main: {
    flex: 1,
    padding: '20px',
    boxSizing: 'border-box' as const,
  },
  uploadButton: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  nav: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
};

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const uploadMutation = trpc.documents.upload.useMutation({
    mutationKey: ['documents', 'upload'],
  });

  const activeTab = location.pathname.startsWith('/documents') ? 'documents' : 'todos';

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 10px',
    borderRadius: '6px',
    textDecoration: 'none',
    color: isActive ? '#007bff' : '#444',
    backgroundColor: isActive ? '#e9f2ff' : 'transparent',
    fontWeight: isActive ? 'bold' : 'normal',
  });

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      resetFileInput();
      return;
    }

    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      resetFileInput();
      return;
    }

    navigate('/documents');
    void utils.documents.list.invalidate();
    void utils.documents.list.refetch();

    const formData = new FormData();
    formData.append('file', file);
    resetFileInput();

    void uploadMutation
      .mutateAsync(formData)
      .then(() => {
        utils.documents.list.invalidate();
      })
      .catch(() => {
        resetFileInput();
      });
  };

  return (
    <aside style={layoutStyles.sidebar}>
      <button
        type="button"
        onClick={handleUploadClick}
        style={layoutStyles.uploadButton}
      >
        Upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept={ALLOWED_MIME_TYPES.join(',')}
        style={{ display: 'none' }}
      />

      <nav style={layoutStyles.nav}>
        <Link to="/" style={navLinkStyle(activeTab === 'todos')}>
          Todos
        </Link>
        <Link to="/documents" style={navLinkStyle(activeTab === 'documents')}>
          Documents
        </Link>
      </nav>
    </aside>
  );
}

function AppLayout() {
  return (
    <div style={layoutStyles.app}>
      <Sidebar />
      <main style={layoutStyles.main}>
        <Routes>
          <Route path="/" element={<TodoApp />} />
          <Route path="/documents" element={<DocumentUpload />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
