# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
# Start Express server (port 3001, with hot reload)
npm run dev

# Start React development server (port 5173, separate terminal)
npm run dev:client
```

Access the application at http://localhost:5173. The Vite dev server proxies `/api` requests to the Express server.

### Build and Quality Checks
```bash
# Build React app for production
npm run build

# Run all tests (backend and frontend)
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run linting and type checking (always run before commits)
npm run lint
npm run typecheck
```

## Architecture Overview

This is a full-stack TypeScript application with tRPC, MikroORM, and React:

**Backend (`src/server/`)**:
- Express server on port 3001 with tRPC adapter at `/api/trpc`
- MikroORM with SQLite database and request context middleware
- Type-safe API procedures with Zod validation
- Modular route organization in `routes/` subfolder
- Comprehensive Vitest tests with in-memory database and SWC decorator support
- Auto-generated database schema and migrations

**Database (`src/server/entities/`, `src/server/mikro-orm.config.ts`)**:
- SQLite database with MikroORM decorators
- Todo and Document entities with constructor-based initialization
- Automatic timestamps and primary key generation
- Shared constants in `src/shared/documents.ts` for file validation

**Frontend (`src/frontend/`)**:
- React 18 with tRPC React Query integration
- Sidebar layout with file upload and navigation (App.tsx)
- Two-column document review interface (list + PDF viewer)
- Type-safe API calls with automatic caching and invalidation
- Comprehensive React Testing Library tests with Sinon-based tRPC mocking
- Centralized mock management in `__mocks__/trpc.ts`
- Built with Vite for fast development

**Development Workflow**:
- MikroORM request context creates isolated EntityManager per request
- tRPC provides end-to-end type safety from database to UI
- Vite dev server proxies `/api` requests to Express server
- Both frontend and backend have hot reload
- Tests co-located with code for better maintainability
- Vitest configuration with SWC for decorator metadata and Happy DOM for frontend tests

## Configuration Notes

- **Node.js**: v20.16.0 (specified in `.nvmrc`)
- **TypeScript**: CommonJS modules, ES2020 target, includes DOM types, experimental decorators enabled
- **Vite**: Configured with React plugin and API proxy to localhost:3001
- **ESLint**: JavaScript and TypeScript recommended configs
- **MikroORM**: SQLite with reflection, debug mode enabled in development
- **Vitest**: SWC-based configuration with decorator metadata support and Happy DOM
- **Testing**: React Testing Library with Sinon-based tRPC mocking and centralized mock management

## Key Files

### Backend
- `src/server/server.ts` - Express server with tRPC adapter and MikroORM request context
- `src/server/trpc.ts` - Main tRPC router configuration
- `src/server/trpc-base.ts` - Shared tRPC initialization (router, publicProcedure)
- `src/server/routes/todos.ts` - Todo CRUD endpoints with Zod validation
- `src/server/routes/todos.test.ts` - Comprehensive backend tests
- `src/server/routes/documents.ts` - Document upload/CRUD endpoints with file validation and PDF processing
- `src/server/routes/documents.test.ts` - Document endpoint tests
- `src/server/services/file-storage.ts` - File persistence service
- `src/server/services/pdf-extractor.ts` - PDF text extraction using pdf-parse
- `src/server/services/openrouter.ts` - AI-powered data extraction via OpenRouter API
- `src/server/mikro-orm.config.ts` - Database configuration
- `src/server/entities/Todo.ts` - Todo entity with MikroORM decorators
- `src/server/entities/Document.ts` - Document entity with extractedData and storedPath
- `src/server/test-utils/` - Test setup and utilities
- `src/shared/documents.ts` - Shared types (Document, ExtractedData, DocumentStatus, AllowedMimeType)

### Frontend
- `src/frontend/App.tsx` - Sidebar layout with upload button and navigation
- `src/frontend/components/TodoApp.tsx` - Todo CRUD functionality
- `src/frontend/components/TodoApp.test.tsx` - React component tests with Sinon-based tRPC mocking
- `src/frontend/components/DocumentUpload.tsx` - Two-column layout: document list + PDF review panel with extracted data
- `src/frontend/components/DocumentUpload.test.tsx` - Document upload component tests
- `src/frontend/__mocks__/trpc.ts` - Centralized tRPC mocks with Sinon stubs and reset utilities
- `src/frontend/main.tsx` - React entry point with tRPC and React Query providers
- `src/frontend/utils/trpc.ts` - tRPC client configuration with splitLink for FormData support

### Configuration
- `vitest.config.ts` - Vitest configuration with SWC support for decorators and React
- `src/test-setup.ts` - Global test setup for jest-dom matchers
- `vite.config.ts` - Development proxy configuration
- `tsconfig.json` - TypeScript configuration with experimental decorators
- `src/server/config/env.ts` - Environment configuration for OpenRouter API
- `database.sqlite3` - Auto-generated SQLite database file

## Development Patterns

- **Entity Creation**: Use constructor with object params: `new Todo({ title, description })` or `new Document({ filename, fileSize, mimeType, status? })`
- **Database Operations**: Use `ctx.orm.em` directly (no manual forking needed)
- **API Design**: tRPC procedures with Zod input validation
- **State Management**: React Query with tRPC for automatic caching and invalidation
- **Component Structure**: Sidebar layout with feature components (TodoApp, DocumentUpload)
- **Testing**: Tests co-located with code, Sinon-based mocking for clean isolation
- **Mock Management**: Centralized mocks in `__mocks__/` with reset utilities
- **Route Organization**: Separate route files in `src/server/routes/` importing shared tRPC base from `trpc-base.ts`
- **File Uploads**: Native FormData via tRPC with `zod-form-data` validation and `splitLink` for non-JSON routing
- **File Storage**: Documents saved to `uploads/` directory with ID-based filenames
- **PDF Processing**: Automatic text extraction and AI-powered data extraction for PDFs using OpenRouter
- **Document Workflow**: UPLOADING → UPLOADED → PROCESSING → REVIEW → COMPLETED (or ERROR)
- **File Serving**: Express endpoint at `/api/documents/:id/file` with Range request support for PDF viewing