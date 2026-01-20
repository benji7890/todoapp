import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import TodoApp from './components/TodoApp';
import DocumentUpload from './components/DocumentUpload';
import DocumentDetail from './components/DocumentDetail';

function AppContent() {
  const location = useLocation();
  const isDocumentDetail = location.pathname.startsWith('/documents/');

  // Don't show tabs on document detail page
  if (isDocumentDetail) {
    return <DocumentDetail />;
  }

  const activeTab = location.pathname === '/documents' ? 'documents' : 'todos';

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: isActive ? '2px solid #007bff' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: isActive ? '#007bff' : '#666',
    fontWeight: isActive ? 'bold' : 'normal',
    cursor: 'pointer',
    fontSize: '16px',
    textDecoration: 'none',
    display: 'inline-block',
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Todo App with tRPC + MikroORM</h1>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
        <Link
          to="/"
          style={tabStyle(activeTab === 'todos')}
        >
          Todos
        </Link>
        <Link
          to="/documents"
          style={tabStyle(activeTab === 'documents')}
        >
          Documents
        </Link>
      </div>
      <Routes>
        <Route path="/" element={<TodoApp />} />
        <Route path="/documents" element={<DocumentUpload />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/documents/:id" element={<DocumentDetail />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;