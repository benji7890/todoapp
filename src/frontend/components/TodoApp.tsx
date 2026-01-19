import { useState } from 'react';
import { trpc } from '../utils/trpc';

function TodoApp() {
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  
  const todosQuery = trpc.todos.list.useQuery();
  const createTodoMutation = trpc.todos.create.useMutation();
  const updateTodoMutation = trpc.todos.update.useMutation();
  const deleteTodoMutation = trpc.todos.delete.useMutation();

  const utils = trpc.useUtils();

  const handleCreateTodo = async () => {
    if (todoTitle.trim()) {
      await createTodoMutation.mutateAsync({
        title: todoTitle,
        description: todoDescription || undefined,
      });
      setTodoTitle('');
      setTodoDescription('');
      utils.todos.list.invalidate();
    }
  };

  const handleToggleComplete = async (id: number, completed: boolean) => {
    await updateTodoMutation.mutateAsync({
      id,
      completed: !completed,
    });
    utils.todos.list.invalidate();
  };

  const handleDeleteTodo = async (id: number) => {
    await deleteTodoMutation.mutateAsync({ id });
    utils.todos.list.invalidate();
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Add New Todo</h3>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={todoTitle}
            onChange={(e) => setTodoTitle(e.target.value)}
            placeholder="Todo title (required)"
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
          <textarea
            value={todoDescription}
            onChange={(e) => setTodoDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{ width: '100%', padding: '8px', height: '60px', resize: 'vertical' }}
          />
        </div>
        <button 
          onClick={handleCreateTodo}
          disabled={createTodoMutation.isPending || !todoTitle.trim()}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {createTodoMutation.isPending ? 'Creating...' : 'Add Todo'}
        </button>
      </div>

      <div>
        <h3>Todo List</h3>
        {todosQuery.isLoading ? (
          <p>Loading todos...</p>
        ) : todosQuery.error ? (
          <p style={{ color: 'red' }}>Error: {todosQuery.error.message}</p>
        ) : todosQuery.data?.length === 0 ? (
          <p style={{ color: '#666' }}>No todos yet. Add one above!</p>
        ) : (
          <div>
            {todosQuery.data?.map((todo) => (
              <div 
                key={todo.id} 
                style={{ 
                  padding: '15px', 
                  margin: '10px 0', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: todo.completed ? '#f0f8f0' : '#fff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: '0 0 5px 0', 
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      color: todo.completed ? '#666' : '#000'
                    }}>
                      {todo.title}
                    </h4>
                    {todo.description && (
                      <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                        {todo.description}
                      </p>
                    )}
                    <small style={{ color: '#999' }}>
                      Created: {new Date(todo.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => todo.id && handleToggleComplete(todo.id, todo.completed)}
                      disabled={updateTodoMutation.isPending || !todo.id}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: todo.completed ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {todo.completed ? 'Undo' : 'Complete'}
                    </button>
                    <button
                      onClick={() => todo.id && handleDeleteTodo(todo.id)}
                      disabled={deleteTodoMutation.isPending || !todo.id}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TodoApp;