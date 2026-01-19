# Todo App with tRPC + MikroORM

A full-stack TypeScript application demonstrating modern web development practices with type-safe APIs and database integration.

## Features

- **Backend**: Express server with tRPC for type-safe APIs
- **Database**: SQLite with MikroORM for type-safe database operations
- **Frontend**: React with TypeScript and React Query for state management
- **Validation**: Zod schemas for runtime type validation
- **Full-Stack Type Safety**: End-to-end TypeScript inference from database to UI

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

## Development

To run the application in development mode:

1. Start the Express server:
   ```bash
   npm run dev
   ```
   This starts the server on http://localhost:3001

2. In a separate terminal, start the React development server:
   ```bash
   npm run dev:client
   ```
   This starts the Vite dev server with proxy to the Express API

3. Open http://localhost:5173 in your browser

## API Endpoints

### tRPC Endpoints (via `/api/trpc`)

- `hello` (query) - Returns a hello world message
- `todos.list` (query) - Get all todos
- `todos.create` (mutation) - Create a new todo
- `todos.update` (mutation) - Update an existing todo
- `todos.delete` (mutation) - Delete a todo
- `todos.get` (query) - Get a single todo by ID

All endpoints include full TypeScript type safety and Zod validation.

## Scripts

- `npm run dev` - Start Express server
- `npm run dev:client` - Start React development server
- `npm run build` - Build React app for production
- `npm run preview` - Preview production build
- `npm test` - Run all tests (backend and frontend)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
src/
  ├── server/
  │   ├── server.ts           # Express server with tRPC adapter
  │   ├── trpc.ts             # Main tRPC router configuration
  │   ├── mikro-orm.config.ts # Database configuration
  │   ├── entities/
  │   │   └── Todo.ts         # Todo entity/model
  │   ├── routes/
  │   │   ├── todos.ts        # Todo CRUD endpoints
  │   │   └── todos.test.ts   # Backend tests for todo endpoints
  │   └── test-utils/
  │       ├── setup.ts        # Test database setup
  │       └── trpc-test-utils.ts # tRPC test helpers
  └── frontend/
      ├── App.tsx             # Main app layout
      ├── main.tsx            # React entry point with providers
      ├── __mocks__/
      │   └── trpc.ts         # Centralized tRPC mocks with Sinon
      ├── components/
      │   ├── TodoApp.tsx     # Todo CRUD component
      │   └── TodoApp.test.tsx # React component tests
      └── utils/
          └── trpc.ts         # tRPC client configuration
vitest.config.ts            # Vitest configuration with SWC support
src/test-setup.ts           # Global test setup
index.html                   # HTML template
vite.config.ts              # Vite configuration with API proxy
database.sqlite3            # SQLite database (auto-generated)
```

## Technology Stack

### Backend
- **Express.js** - Web server framework
- **tRPC** - Type-safe API framework
- **MikroORM** - TypeScript ORM with decorators
- **SQLite** - Lightweight database
- **Zod** - Runtime type validation

### Frontend
- **React 18** - UI framework with hooks
- **TypeScript** - Static type checking
- **tRPC React Query** - Type-safe data fetching
- **Vite** - Fast build tool and dev server

### Development & Testing
- **TypeScript** - Full-stack type safety
- **ESLint** - Code quality and consistency
- **Nodemon** - Server hot reload
- **ts-node** - TypeScript execution
- **Vitest** - Fast testing framework with native ESM support
- **Sinon** - Powerful mocking and stubbing library
- **SWC** - Fast TypeScript compiler with decorator metadata support
- **React Testing Library** - React component testing
- **@testing-library/jest-dom** - DOM matchers for testing
- **Happy DOM** - Lightweight DOM implementation for tests

## Testing

The project includes comprehensive testing for both backend and frontend using Vitest:

### Backend Tests
- Located adjacent to the code they test (`src/server/routes/todos.test.ts`)
- Uses Vitest with Node.js environment and SWC for decorator metadata support
- Tests all tRPC endpoints with in-memory SQLite database
- Includes setup utilities for database isolation

### Frontend Tests
- Located adjacent to components (`src/frontend/components/TodoApp.test.tsx`)
- Uses Vitest with Happy DOM environment and React Testing Library
- Tests user interactions, API integration, and component behavior
- Includes Sinon-based mocking of tRPC hooks in `src/frontend/__mocks__/trpc.ts`
- Centralized mock management with reset utilities

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

All tests run in isolation with proper setup/teardown for reliable results.