# Smart Document Upload Flow - Take-Home Preparation

## Overview
This is the **preparation phase** for our coding interview. You'll set up the development environment, explore the codebase, and implement basic file upload functionality. The actual document processing and review interface will be built during the live coding session.

**Time Estimate**: 30-60 minutes  
**AI Tools**: You are **encouraged** to use Claude Code or other AI assistants  
**Goal**: Arrive at the live session with a working environment and basic understanding of the codebase

## Your Take-Home Tasks

Complete these preparation tasks before the live coding session:

### 1. Environment Setup & Verification
- **Clone and Setup**: Get the application running locally
- **Database Verification**: Ensure SQLite database is working with existing todo functionality
- **Port Configuration**: Verify both frontend (5173) and backend (3001) servers start without conflicts
- **Test the Stack**: Run existing tests to ensure everything works

### 2. Codebase Exploration
- **Architecture Review**: Understand the tRPC + MikroORM + React setup
- **Entity Structure**: Study the existing Todo entity and database patterns
- **API Patterns**: Review how tRPC endpoints are structured in `src/server/routes/`
- **Frontend Patterns**: Examine the React components and tRPC client integration

### 3. Basic File Upload Implementation
- **Create Document Entity**: Add a new MikroORM entity for documents with fields:
  - `id`, `filename`, `fileSize`, `mimeType`, `uploadedAt`, `status`
- **File Upload Endpoint**: Create a tRPC endpoint that accepts file uploads
- **Basic Frontend**: Add a simple file upload form to the React app
- **Status Tracking**: Implement basic upload status (UPLOADING, UPLOADED, ERROR)

## Technical Implementation Notes

### Backend Focus Areas
- **Extend Existing Patterns**: Follow the same patterns used in the Todo routes
- **File Upload**: Research tRPC file upload patterns (hint: look into `@trpc/server` adapters)
- **Entity Design**: Use MikroORM decorators similar to the Todo entity
- **Error Handling**: Include basic try/catch blocks and appropriate error responses

### Frontend Focus Areas  
- **Component Structure**: Create new components following the TodoApp pattern
- **File Input**: Use HTML5 file input with basic validation
- **tRPC Integration**: Use the existing tRPC client setup with React Query
- **State Management**: Leverage React Query's built-in loading and error states

## Preparation Success Criteria

### Environment & Setup
- ✅ Both servers (frontend/backend) start without errors  
- ✅ Existing todo functionality works (create, read, update, delete)
- ✅ Tests pass with `npm test`
- ✅ No port conflicts or dependency issues

### Code Implementation
- ✅ Document entity created with proper MikroORM decorators
- ✅ Basic file upload endpoint accepts files and stores metadata
- ✅ Simple frontend file upload form with basic validation
- ✅ Tests written for both backend and frontend components using existing patterns

### Understanding Demonstrated
- ✅ Can explain the tRPC + MikroORM architecture
- ✅ Understands how entities, routes, and frontend components connect
- ✅ Familiar with the testing patterns used in the project
- ✅ Ready to build on this foundation during live coding

## Getting Started

### Step 1: Environment Setup
```bash
# Install dependencies
npm install

# Verify Node.js version (should be v20.16.0, see .nvmrc)
node --version

# Start the backend server (Terminal 1)
npm run dev

# Start the frontend dev server (Terminal 2) 
npm run dev:client

# Verify everything works
# Visit http://localhost:5173 and test the todo functionality
```

### Step 2: Run Tests & Verify Setup
```bash
# Run all tests to ensure environment is working
npm test

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### Step 3: Explore the Codebase
- Study `src/server/entities/Todo.ts` for MikroORM patterns
- Review `src/server/routes/todos.ts` for tRPC endpoint structure  
- Examine `src/frontend/components/TodoApp.tsx` for React + tRPC patterns
- Check `src/server/routes/todos.test.ts` for testing approaches

### Step 4: Implement Basic File Upload
Start with the Document entity, then the upload endpoint, then the frontend form, and finally add tests.

**Need Help?** Check CLAUDE.md for detailed development commands and architecture notes.

## Common Issues & Troubleshooting

### Port Conflicts
- If port 3001 or 5173 are in use, kill existing processes or change ports in package.json
- Use `lsof -i :3001` to find processes using port 3001

### Database Issues  
- If migrations fail, delete `database.sqlite3` and restart the server
- MikroORM will auto-create the database and tables on startup

### Missing Dependencies
- If you get decorator errors, ensure TypeScript is configured for experimental decorators
- Check that all dev dependencies are installed with `npm install`

### File Upload Challenges
- Look into `multer` or `@trpc/server` file upload examples
- Consider using `FormData` on the frontend for file uploads
- Remember to handle file size limits and MIME type validation

## What to Bring to Live Session

- **Working file upload**: Demonstrate uploading a file and seeing it in the database
- **Passing tests**: Show that your new tests pass and existing tests still work
- **Architecture understanding**: Be able to explain your Document entity and API design
- **Questions list**: Prepare questions about requirements that weren't clear

**Focus on functionality over polish** - we want to see your problem-solving process and how you work with AI tools!