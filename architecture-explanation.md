# Architecture Explanation

## Section 2: tRPC Setup Review

### 1. Main Router Configuration (`src/server/trpc.ts`)

**Key components:**

- **Context Interface** (lines 5-7): Defines the context shape containing `MikroORM` instance, making the database available to all procedures
  ```typescript
  export interface Context {
    orm: MikroORM;
  }
  ```

- **tRPC Initialization** (line 9): Creates tRPC instance with typed context
  ```typescript
  const t = initTRPC.context<Context>().create();
  ```

- **Router & Procedure exports** (lines 11-12): Exports `router` and `publicProcedure` for building routes

- **App Router** (lines 14-22): Combines all routes into a single router with:
  - `hello` - simple test endpoint
  - `todos` - imported from `routes/todos.ts`

- **Type Export** (line 24): `AppRouter` type is exported for frontend consumption

### 2. How tRPC Provides End-to-End Type Safety

The type safety chain works as follows:

1. **Backend defines types** in `src/server/trpc.ts:24`:
   ```typescript
   export type AppRouter = ReturnType<typeof createAppRouter>;
   ```

2. **Frontend imports the type** in `src/frontend/utils/trpc.ts:2`:
   ```typescript
   import type { AppRouter } from '../../server/trpc';
   export const trpc = createTRPCReact<AppRouter>();
   ```

3. **Components get full autocomplete** in `TodoApp.tsx`:
   - `trpc.todos.list.useQuery()` - TypeScript knows the return type is `Todo[]`
   - `trpc.todos.create.useMutation()` - Input is validated against Zod schema
   - `todosQuery.data?.map((todo) => ...)` - `todo` is fully typed with `id`, `title`, `description`, `completed`, `createdAt`

**Key insight**: The `type` import keyword ensures only types are imported (no runtime code), so the backend code never gets bundled into the frontend. The type information flows through TypeScript's type system at compile time.

**Zod validation** in `routes/todos.ts` adds runtime validation that matches the TypeScript types:
```typescript
.input(z.object({
  title: z.string().min(1),
  description: z.string().optional(),
}))
```

---

## MikroORM Patterns

### 1. Entity Definition (`src/server/entities/Todo.ts`)

**Decorators used:**

- `@Entity()` - Marks class as a database entity (table)
- `@PrimaryKey()` - Marks field as primary key (auto-increment by default)
- `@Property()` - Marks field as a database column
- `@Property({ nullable: true })` - Optional field (can be NULL)
- `@Property({ onUpdate: () => new Date() })` - Auto-update on entity modification

**Entity structure:**
```typescript
@Entity()
export class Todo {
  @PrimaryKey()
  id?: number;  // Optional because auto-generated

  @Property()
  title: string;

  @Property({ nullable: true })
  description?: string;

  @Property()
  completed: boolean;

  @Property()
  createdAt: Date;

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date;

  constructor(params: { title: string; description?: string }) {
    this.title = params.title;
    this.description = params.description;
    this.completed = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
```

**Key pattern:** Constructor-based initialization with typed params object. Default values are set in constructor (`completed = false`, timestamps = `new Date()`).

### 2. Database Configuration (`src/server/mikro-orm.config.ts`)

```typescript
import { defineConfig } from '@mikro-orm/sqlite';
import { Todo } from './entities/Todo';

export default defineConfig({
  entities: [Todo],        // All entities must be registered here
  dbName: 'database.sqlite3',  // SQLite database file
  debug: true,             // Logs SQL queries in development
});
```

**Key points:**
- Uses `defineConfig` from `@mikro-orm/sqlite` for SQLite-specific config
- All entities must be explicitly listed in `entities` array
- Database file is auto-created if it doesn't exist

### 3. Server Integration (`src/server/server.ts`)

**Initialization:**
```typescript
const orm = await MikroORM.init(config);
await orm.getSchemaGenerator().ensureDatabase();
await orm.getSchemaGenerator().updateSchema();
```

**Request Context Middleware:**
```typescript
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});
```

This creates an isolated `EntityManager` for each request, preventing data leaks between concurrent requests.

**tRPC Context:**
```typescript
createContext: () => ({ orm }),
```

The ORM instance is passed to tRPC context, making it available in all procedures via `ctx.orm`.

### 4. Database Operations in Routes

Common operations in `src/server/routes/todos.ts`:

- **Find all:** `ctx.orm.em.find(Todo, {})`
- **Find one:** `ctx.orm.em.findOneOrFail(Todo, id)`
- **Create:** `ctx.orm.em.persistAndFlush(entity)`
- **Update:** Modify entity properties, then `ctx.orm.em.flush()`
- **Delete:** `ctx.orm.em.removeAndFlush(entity)`

---

## API Patterns (tRPC + Zod)

### 1. Route Structure (`src/server/routes/todos.ts`)

**Pattern for creating route files:**
```typescript
import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { Todo } from '../entities/Todo';
import type { Context } from '../trpc';

const t = initTRPC.context<Context>().create();
const router = t.router;
const publicProcedure = t.procedure;

export const todosRouter = router({
  // endpoints go here
});
```

### 2. Query Endpoints (Read operations)

```typescript
list: publicProcedure.query(async ({ ctx }) => {
  return await ctx.orm.em.find(Todo, {});
}),

get: publicProcedure
  .input(z.object({
    id: z.number(),
  }))
  .query(async ({ input, ctx }) => {
    return await ctx.orm.em.findOneOrFail(Todo, input.id);
  }),
```

### 3. Mutation Endpoints (Write operations)

```typescript
create: publicProcedure
  .input(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const todo = new Todo({
      title: input.title,
      description: input.description
    });
    await ctx.orm.em.persistAndFlush(todo);
    return todo;
  }),
```

### 4. Zod Validation Patterns

- `z.string()` - Required string
- `z.string().min(1)` - Non-empty string
- `z.string().optional()` - Optional string
- `z.number()` - Required number
- `z.boolean().optional()` - Optional boolean
- `z.object({...})` - Object schema

### 5. Error Handling

MikroORM's `findOneOrFail` throws automatically if entity not found. tRPC converts this to an error response. For custom errors:

```typescript
import { TRPCError } from '@trpc/server';

throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Document not found',
});
```

---

## Frontend Patterns

### 1. tRPC Client Setup (`src/frontend/utils/trpc.ts`)

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/trpc';

export const trpc = createTRPCReact<AppRouter>();
```

The `type` import ensures no server code is bundled into the frontend.

### 2. Provider Setup (`src/frontend/main.tsx`)

```typescript
const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',  // Proxied by Vite to Express server
    }),
  ],
});

// Provider hierarchy: tRPC > QueryClient > App
<trpc.Provider client={trpcClient} queryClient={queryClient}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</trpc.Provider>
```

### 3. Component Patterns (`src/frontend/components/TodoApp.tsx`)

**Query hooks:**
```typescript
const todosQuery = trpc.todos.list.useQuery();

// Access data
todosQuery.data      // Todo[] | undefined
todosQuery.isLoading // boolean
todosQuery.error     // TRPCError | null
```

**Mutation hooks:**
```typescript
const createTodoMutation = trpc.todos.create.useMutation();

// Call mutation
await createTodoMutation.mutateAsync({
  title: 'New Todo',
  description: 'Optional description',
});

// Access state
createTodoMutation.isPending // boolean
```

**Query invalidation (cache refresh):**
```typescript
const utils = trpc.useUtils();

// After mutation, refresh the list
utils.todos.list.invalidate();
```

### 4. App Structure (`src/frontend/App.tsx`)

Simple layout component that renders feature components:
```typescript
function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Todo App with tRPC + MikroORM</h1>
      <TodoApp />
    </div>
  );
}
```

To add new features, import and render new components here.

---

## Testing Patterns

### 1. Backend Tests (`src/server/routes/todos.test.ts`)

**Setup utilities:**

- `setupTestDb()` - Creates in-memory SQLite database
- `clearTestDb()` - Clears all data between tests
- `closeTestDb()` - Closes database connection
- `createTestCaller(orm)` - Creates tRPC caller for direct endpoint testing

**Test structure:**
```typescript
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

  // Helper for request context isolation
  const runInContext = async (fn: () => Promise<void>) => {
    await RequestContext.create(orm.em, fn);
  };

  it('should create a todo', async () => {
    await runInContext(async () => {
      const result = await caller.todos.create({
        title: 'Test Todo'
      });
      expect(result.title).toBe('Test Todo');
    });
  });
});
```

**Key pattern:** All database operations must be wrapped in `runInContext` to ensure proper EntityManager isolation.

### 2. Frontend Tests (`src/frontend/components/TodoApp.test.tsx`)

**Mock setup:**

```typescript
import { mockStubs, resetAllMocks } from '../__mocks__/trpc';

vi.mock('../utils/trpc', async () => {
  const mockModule = await import('../__mocks__/trpc');
  return mockModule;
});
```

**Test wrapper with QueryClient:**
```typescript
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
```

**Mock configuration per test:**
```typescript
beforeEach(() => {
  resetAllMocks();

  mockStubs.todosListUseQuery.returns({
    data: [],
    isLoading: false,
    error: null,
  });

  mockStubs.todosCreateUseMutation.returns({
    mutateAsync: vi.fn(),
    isPending: false,
  });
});
```

**Test example:**
```typescript
it('displays todos when they exist', () => {
  mockStubs.todosListUseQuery.returns({
    data: mockTodos,
    isLoading: false,
    error: null,
  });

  render(<TodoApp />, { wrapper: createWrapper() });

  expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
});
```

### 3. Mock Management (`src/frontend/__mocks__/trpc.ts`)

**Sinon-based stubs for tRPC hooks:**
```typescript
import sinon from 'sinon';

const mockTodos = {
  list: { useQuery: sinon.stub() },
  create: { useMutation: sinon.stub() },
  update: { useMutation: sinon.stub() },
  delete: { useMutation: sinon.stub() },
};

export const trpc = {
  todos: mockTodos,
  useUtils: sinon.stub(),
};

export const mockStubs = {
  todosListUseQuery: mockTodos.list.useQuery,
  todosCreateUseMutation: mockTodos.create.useMutation,
  // ... etc
};

export const resetAllMocks = () => {
  Object.values(mockStubs).forEach(stub => stub.reset());
};
```

**To add mocks for new endpoints (e.g., documents):**
```typescript
const mockDocuments = {
  list: { useQuery: sinon.stub() },
  upload: { useMutation: sinon.stub() },
};

export const trpc = {
  todos: mockTodos,
  documents: mockDocuments,  // Add new endpoint
  useUtils: sinon.stub(),
};

export const mockStubs = {
  // existing stubs...
  documentsListUseQuery: mockDocuments.list.useQuery,
  documentsUploadUseMutation: mockDocuments.upload.useMutation,
};
```