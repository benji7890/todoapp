import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { setupTestDb, clearTestDb, closeTestDb } from '../test-utils/setup';
import { createTestCaller, type TestCaller } from '../test-utils/trpc-test-utils';
import { Todo } from '../entities/Todo';

describe('Todo tRPC Endpoints', () => {
  let orm: MikroORM;
  let caller: TestCaller;

  beforeAll(async () => {
    orm = await setupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    caller = createTestCaller(orm);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // Helper function to run tests within RequestContext
  const runInContext = async (fn: () => Promise<void>) => {
    await RequestContext.create(orm.em, fn);
  };

  describe('todos.list', () => {
    it('should return empty list when no todos exist', async () => {
      await runInContext(async () => {
        const result = await caller.todos.list();
        expect(result).toEqual([]);
      });
    });

    it('should return all todos when they exist', async () => {
      await runInContext(async () => {
        // Create test todos
        const todo1 = new Todo({ title: 'Test Todo 1', description: 'Description 1' });
        const todo2 = new Todo({ title: 'Test Todo 2' });
        await orm.em.persistAndFlush([todo1, todo2]);

        const result = await caller.todos.list();
        
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('Test Todo 1');
        expect(result[0].description).toBe('Description 1');
        expect(result[0].completed).toBe(false);
        expect(result[1].title).toBe('Test Todo 2');
        expect(result[1].description).toBeUndefined();
      });
    });
  });

  describe('todos.create', () => {
    it('should create a todo with title only', async () => {
      await runInContext(async () => {
        const result = await caller.todos.create({
          title: 'New Todo'
        });

        expect(result.title).toBe('New Todo');
        expect(result.description).toBeUndefined();
        expect(result.completed).toBe(false);
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });
    });

    it('should create a todo with title and description', async () => {
      await runInContext(async () => {
        const result = await caller.todos.create({
          title: 'New Todo',
          description: 'Todo description'
        });

        expect(result.title).toBe('New Todo');
        expect(result.description).toBe('Todo description');
        expect(result.completed).toBe(false);
      });
    });

    it('should fail with empty title', async () => {
      await runInContext(async () => {
        await expect(
          caller.todos.create({ title: '' })
        ).rejects.toThrow();
      });
    });

    it('should persist todo to database', async () => {
      await runInContext(async () => {
        await caller.todos.create({
          title: 'Persisted Todo',
          description: 'Should be in DB'
        });

        const todos = await orm.em.find(Todo, {});
        expect(todos).toHaveLength(1);
        expect(todos[0].title).toBe('Persisted Todo');
      });
    });
  });

  describe('todos.get', () => {
    it('should return todo by id', async () => {
      await runInContext(async () => {
        const todo = new Todo({ title: 'Get Todo Test', description: 'Test description' });
        await orm.em.persistAndFlush(todo);

        const result = await caller.todos.get({ id: todo.id! });
        
        expect(result.id).toBe(todo.id);
        expect(result.title).toBe('Get Todo Test');
        expect(result.description).toBe('Test description');
      });
    });

    it('should throw error for non-existent id', async () => {
      await runInContext(async () => {
        await expect(
          caller.todos.get({ id: 999 })
        ).rejects.toThrow();
      });
    });
  });

  describe('todos.update', () => {
    let testTodo: Todo;

    beforeEach(async () => {
      await runInContext(async () => {
        testTodo = new Todo({ title: 'Original Title', description: 'Original Description' });
        await orm.em.persistAndFlush(testTodo);
      });
    });

    it('should update todo title', async () => {
      await runInContext(async () => {
        const result = await caller.todos.update({
          id: testTodo.id!,
          title: 'Updated Title'
        });

        expect(result.title).toBe('Updated Title');
        expect(result.description).toBe('Original Description');
        expect(result.completed).toBe(false);
      });
    });

    it('should update todo description', async () => {
      await runInContext(async () => {
        const result = await caller.todos.update({
          id: testTodo.id!,
          description: 'Updated Description'
        });

        expect(result.title).toBe('Original Title');
        expect(result.description).toBe('Updated Description');
      });
    });

    it('should update completed status', async () => {
      await runInContext(async () => {
        const result = await caller.todos.update({
          id: testTodo.id!,
          completed: true
        });

        expect(result.completed).toBe(true);
        expect(result.title).toBe('Original Title');
      });
    });

    it('should update multiple fields', async () => {
      await runInContext(async () => {
        const result = await caller.todos.update({
          id: testTodo.id!,
          title: 'New Title',
          description: 'New Description',
          completed: true
        });

        expect(result.title).toBe('New Title');
        expect(result.description).toBe('New Description');
        expect(result.completed).toBe(true);
      });
    });

    it('should throw error for non-existent id', async () => {
      await runInContext(async () => {
        await expect(
          caller.todos.update({
            id: 999,
            title: 'New Title'
          })
        ).rejects.toThrow();
      });
    });

    it('should persist changes to database', async () => {
      await runInContext(async () => {
        await caller.todos.update({
          id: testTodo.id!,
          title: 'Persisted Update'
        });

        const updatedTodo = await orm.em.findOneOrFail(Todo, testTodo.id!);
        expect(updatedTodo.title).toBe('Persisted Update');
      });
    });
  });

  describe('todos.delete', () => {
    let testTodo: Todo;

    beforeEach(async () => {
      await runInContext(async () => {
        testTodo = new Todo({ title: 'Todo to Delete', description: 'Will be deleted' });
        await orm.em.persistAndFlush(testTodo);
      });
    });

    it('should delete todo and return success', async () => {
      await runInContext(async () => {
        const result = await caller.todos.delete({ id: testTodo.id! });
        
        expect(result.success).toBe(true);
      });
    });

    it('should remove todo from database', async () => {
      await runInContext(async () => {
        await caller.todos.delete({ id: testTodo.id! });

        const todos = await orm.em.find(Todo, {});
        expect(todos).toHaveLength(0);
      });
    });

    it('should throw error for non-existent id', async () => {
      await runInContext(async () => {
        await expect(
          caller.todos.delete({ id: 999 })
        ).rejects.toThrow();
      });
    });
  });

  describe('hello endpoint', () => {
    it('should return hello message', async () => {
      const result = await caller.hello();
      expect(result.message).toBe('Hello World!');
    });
  });
});