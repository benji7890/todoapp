# Architecture Explanation (Simplified)

This app is a small full-stack TypeScript project:

- Backend: Express + tRPC + MikroORM (SQLite)
- Frontend: React + tRPC React Query
- Shared: TypeScript types for strong end-to-end typing

The main idea: a request goes from React -> tRPC -> database, all with types.

---

## 1) Big Picture Flow

1. React UI calls a tRPC procedure.
2. The tRPC router on the server validates input with Zod.
3. The procedure uses MikroORM to read/write SQLite.
4. The result is typed end-to-end back to the UI.

Diagram (request flow):
```text
Browser UI
  |
  v
React component
  |
  v
tRPC client (React Query)
  |
  v
Express + tRPC adapter
  |
  v
tRPC router + Zod validation
  |
  v
MikroORM EntityManager
  |
  v
SQLite
```

---

## 2) Backend (tRPC + Express)

### Server Setup
`src/server/server.ts`:

- Creates the Express app.
- Starts MikroORM and updates schema.
- Adds MikroORM RequestContext middleware.
- Mounts tRPC at `/api/trpc`.

Why RequestContext matters:
Each request gets its own EntityManager so queries do not leak across requests.

Diagram (server pipeline):
```text
HTTP request
  |
  v
Express middleware
  |
  v
RequestContext.create(orm.em)
  |
  v
tRPC express adapter
  |
  v
Procedure handler
```

---

## 3) tRPC Router Structure

`src/server/trpc-base.ts`:

- Initializes tRPC with a typed context.
- Exports `router` and `publicProcedure`.

`src/server/trpc.ts`:

- Combines route modules: `todos` + `documents`.
- Exports `AppRouter` type for the frontend.

Example pattern:
```ts
export const todosRouter = router({
  list: publicProcedure.query(({ ctx }) => ctx.orm.em.find(Todo, {})),
});
```

Diagram (router composition):
```text
createAppRouter()
  |
  +-- hello
  +-- todos
  |     +-- list / create / update / delete / get
  |
  +-- documents
        +-- list / get / upload / delete
```

---

## 4) Database (MikroORM)

Entities live in `src/server/entities/`.

Example: `Todo` has:
- `@PrimaryKey` id
- `@Property` fields
- Constructor for defaults

Why this pattern:
- Keeps entity creation consistent.
- Lets MikroORM handle persistence and timestamps.

Configuration:
`src/server/mikro-orm.config.ts` lists entities and SQLite db name.

---

## 5) Frontend (React + tRPC)

Client setup:
`src/frontend/utils/trpc.ts` uses the server router type:
```ts
import type { AppRouter } from '../../server/trpc';
export const trpc = createTRPCReact<AppRouter>();
```

App setup:
`src/frontend/main.tsx` creates a tRPC client and React Query provider.

Component usage:
```ts
const todosQuery = trpc.todos.list.useQuery();
const createTodo = trpc.todos.create.useMutation();
```

React Query handles caching; you invalidate after mutations:
```ts
const utils = trpc.useUtils();
utils.todos.list.invalidate();
```

Diagram (frontend data flow):
```text
User action
  |
  v
useMutation() or useQuery()
  |
  v
tRPC client
  |
  v
React Query cache
```

---

## 6) File Upload Pattern

Documents use FormData:
- Frontend sends a file via `FormData`.
- Backend validates with `zod-form-data`.
- Only metadata is stored in SQLite (not the actual file).

Shared validation:
`src/shared/documents.ts` defines allowed MIME types and size limit.

Diagram (file upload flow):
```text
File input
  |
  v
FormData
  |
  v
tRPC client (httpLink)
  |
  v
tRPC adapter (multipart)
  |
  v
Zod-form-data validation
  |
  v
Document entity saved
```

---

## 7) Testing Patterns

Backend tests:
- Use in-memory SQLite.
- Use tRPC caller (no HTTP).
- Wrap DB calls in RequestContext.

Frontend tests:
- Mock tRPC hooks with Sinon.
- Test UI state and user flows.

Diagram (test layers):
```text
Frontend tests: React component -> mocked tRPC hooks
Backend tests: tRPC caller -> MikroORM (in-memory SQLite)
HTTP tests: fetch -> Express + tRPC adapter -> MikroORM
```

---

## 8) Key Files to Study

- `src/server/server.ts` (Express + tRPC setup)
- `src/server/trpc.ts` (router composition)
- `src/server/routes/todos.ts` (CRUD pattern)
- `src/server/routes/documents.ts` (FormData upload)
- `src/frontend/components/TodoApp.tsx` (query + mutation usage)
- `src/frontend/components/DocumentUpload.tsx` (file upload UI)

---

## Quick Summary

- tRPC connects frontend and backend with types.
- MikroORM handles database entities and queries.
- React Query handles caching and async UI.
- File uploads use FormData + Zod validation.
