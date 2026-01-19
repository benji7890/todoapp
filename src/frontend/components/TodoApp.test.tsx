import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockStubs, resetAllMocks } from '../__mocks__/trpc';

// Mock the tRPC module
vi.mock('../utils/trpc', async () => {
  const mockModule = await import('../__mocks__/trpc');
  return mockModule;
});

import TodoApp from './TodoApp';

// Helper to create a test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Sample todo data for testing
const mockTodos = [
  {
    id: 1,
    title: 'Test Todo 1',
    description: 'Description 1',
    completed: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    title: 'Test Todo 2',
    description: null,
    completed: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

describe('TodoApp', () => {
  const mockListQuery = {
    data: [],
    isLoading: false,
    error: null,
  };

  const mockCreateMutationObj = {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  };

  const mockUpdateMutationObj = {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  };

  const mockDeleteMutationObj = {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  };

  const mockUtils = {
    todos: {
      list: {
        invalidate: vi.fn(),
      },
    },
    client: {},
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    mockStubs.todosListUseQuery.returns(mockListQuery);
    mockStubs.todosCreateUseMutation.returns(mockCreateMutationObj);
    mockStubs.todosUpdateUseMutation.returns(mockUpdateMutationObj);
    mockStubs.todosDeleteUseMutation.returns(mockDeleteMutationObj);
    mockStubs.useUtils.returns(mockUtils);
  });

  it('renders the todo app with form and empty message', () => {
    render(<TodoApp />, { wrapper: createWrapper() });

    expect(screen.getByText('Add New Todo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Todo title (required)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
    expect(screen.getByText('Add Todo')).toBeInTheDocument();
    expect(screen.getByText('No todos yet. Add one above!')).toBeInTheDocument();
  });

  it('shows loading state when todos are loading', () => {
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      isLoading: true,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      error: { message: 'Failed to fetch todos' },
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    expect(screen.getByText('Error: Failed to fetch todos')).toBeInTheDocument();
  });

  it('displays todos when they exist', () => {
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      data: mockTodos,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
    expect(screen.getByText(`Created: ${new Date('2024-01-01').toLocaleDateString()}`)).toBeInTheDocument();
    expect(screen.getByText(`Created: ${new Date('2024-01-02').toLocaleDateString()}`)).toBeInTheDocument();
  });

  it('allows user to type in form inputs', async () => {
    const user = userEvent.setup();
    render(<TodoApp />, { wrapper: createWrapper() });

    const titleInput = screen.getByPlaceholderText('Todo title (required)') as HTMLInputElement;
    const descriptionInput = screen.getByPlaceholderText('Description (optional)') as HTMLTextAreaElement;

    await user.type(titleInput, 'New Todo Title');
    await user.type(descriptionInput, 'New Todo Description');

    expect(titleInput).toHaveValue('New Todo Title');
    expect(descriptionInput).toHaveValue('New Todo Description');
  });

  it('disables add button when title is empty', () => {
    render(<TodoApp />, { wrapper: createWrapper() });

    const addButton = screen.getByText('Add Todo') as HTMLButtonElement;
    expect(addButton).toBeDisabled();
  });

  it('enables add button when title has content', async () => {
    const user = userEvent.setup();
    render(<TodoApp />, { wrapper: createWrapper() });

    const titleInput = screen.getByPlaceholderText('Todo title (required)');
    const addButton = screen.getByText('Add Todo') as HTMLButtonElement;

    await user.type(titleInput, 'New Todo');

    expect(addButton).not.toBeDisabled();
  });

  it('calls create mutation when add todo button is clicked', async () => {
    const user = userEvent.setup();
    render(<TodoApp />, { wrapper: createWrapper() });

    const titleInput = screen.getByPlaceholderText('Todo title (required)');
    const descriptionInput = screen.getByPlaceholderText('Description (optional)');
    const addButton = screen.getByText('Add Todo');

    await user.type(titleInput, 'New Todo Title');
    await user.type(descriptionInput, 'New Todo Description');
    await user.click(addButton);

    expect(mockCreateMutationObj.mutateAsync).toHaveBeenCalledWith({
      title: 'New Todo Title',
      description: 'New Todo Description',
    });
  });

  it('clears form and invalidates query after successful todo creation', async () => {
    const user = userEvent.setup();
    mockCreateMutationObj.mutateAsync.mockResolvedValue({});

    render(<TodoApp />, { wrapper: createWrapper() });

    const titleInput = screen.getByPlaceholderText('Todo title (required)') as HTMLInputElement;
    const descriptionInput = screen.getByPlaceholderText('Description (optional)') as HTMLTextAreaElement;
    const addButton = screen.getByText('Add Todo');

    await user.type(titleInput, 'New Todo Title');
    await user.type(descriptionInput, 'New Todo Description');
    await user.click(addButton);

    await waitFor(() => {
      expect(titleInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
      expect(mockUtils.todos.list.invalidate).toHaveBeenCalled();
    });
  });

  it('shows creating state when mutation is pending', () => {
    mockStubs.todosCreateUseMutation.returns({
      ...mockCreateMutationObj,
      isPending: true,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });

  it('displays complete and delete buttons for each todo', () => {
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      data: mockTodos,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    const completeButtons = screen.getAllByText(/Complete|Undo/);
    const deleteButtons = screen.getAllByText('Delete');

    expect(completeButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it('calls update mutation when complete button is clicked', async () => {
    const user = userEvent.setup();
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      data: mockTodos,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    const completeButton = screen.getByText('Complete');
    await user.click(completeButton);

    expect(mockUpdateMutationObj.mutateAsync).toHaveBeenCalledWith({
      id: 1,
      completed: true,
    });
  });

  it('calls delete mutation when delete button is clicked', async () => {
    const user = userEvent.setup();
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      data: mockTodos,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockDeleteMutationObj.mutateAsync).toHaveBeenCalledWith({
      id: 1,
    });
  });

  it('shows undo button for completed todos', () => {
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      data: mockTodos,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('renders completed and incomplete todos correctly', () => {
    mockStubs.todosListUseQuery.returns({
      ...mockListQuery,
      data: mockTodos,
    });

    render(<TodoApp />, { wrapper: createWrapper() });

    // Check that both todos are rendered
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
    
    // Check that the completed todo shows "Undo" and incomplete shows "Complete"
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('does not call create mutation when title is only whitespace', async () => {
    const user = userEvent.setup();
    render(<TodoApp />, { wrapper: createWrapper() });

    const titleInput = screen.getByPlaceholderText('Todo title (required)');
    const addButton = screen.getByText('Add Todo');

    await user.type(titleInput, '   ');
    await user.click(addButton);

    expect(mockCreateMutationObj.mutateAsync).not.toHaveBeenCalled();
  });
});