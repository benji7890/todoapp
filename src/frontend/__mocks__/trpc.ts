import sinon from 'sinon';

// Create mock functions using sinon
const mockTodos = {
  list: {
    useQuery: sinon.stub(),
  },
  create: {
    useMutation: sinon.stub(),
  },
  update: {
    useMutation: sinon.stub(),
  },
  delete: {
    useMutation: sinon.stub(),
  },
};

const mockDocuments = {
  list: {
    useQuery: sinon.stub(),
  },
  upload: {
    useMutation: sinon.stub(),
  },
};

const mockUseUtils = sinon.stub();

// Export the mocked trpc object
export const trpc = {
  todos: mockTodos,
  documents: mockDocuments,
  useUtils: mockUseUtils,
};

// Export the mock functions for easy access in tests
export const mockStubs = {
  todosListUseQuery: mockTodos.list.useQuery,
  todosCreateUseMutation: mockTodos.create.useMutation,
  todosUpdateUseMutation: mockTodos.update.useMutation,
  todosDeleteUseMutation: mockTodos.delete.useMutation,
  documentsListUseQuery: mockDocuments.list.useQuery,
  documentsUploadUseMutation: mockDocuments.upload.useMutation,
  useUtils: mockUseUtils,
};

// Helper function to reset all mocks
export const resetAllMocks = () => {
  Object.values(mockStubs).forEach(stub => stub.reset());
};