import { useState } from 'react';
import TodoApp from './components/TodoApp';
import DocumentUpload from './components/DocumentUpload';

type Tab = 'todos' | 'documents';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('todos');

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: isActive ? '2px solid #007bff' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: isActive ? '#007bff' : '#666',
    fontWeight: isActive ? 'bold' : 'normal',
    cursor: 'pointer',
    fontSize: '16px',
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Todo App with tRPC + MikroORM</h1>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
        <button
          style={tabStyle(activeTab === 'todos')}
          onClick={() => setActiveTab('todos')}
        >
          Todos
        </button>
        <button
          style={tabStyle(activeTab === 'documents')}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </button>
      </div>
      {activeTab === 'todos' && <TodoApp />}
      {activeTab === 'documents' && <DocumentUpload />}
    </div>
  );
}

export default App;