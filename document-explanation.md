# Document Entity and API Design

This document explains the Document entity structure and how the Document API is designed in this application.

## Document Entity

**Location**: `src/server/entities/Document.ts`

The Document entity represents uploaded files stored in the system. It uses MikroORM decorators for database mapping.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Primary key (auto-generated) |
| `filename` | string | Name of the uploaded file |
| `fileSize` | number | File size in bytes |
| `mimeType` | string | MIME type of the file |
| `uploadedAt` | Date | Timestamp when the document was uploaded (auto-set) |
| `status` | string | Current status: `'pending'`, `'uploading'`, `'uploaded'`, or `'error'` |

### Entity Initialization

Documents are created using constructor-based initialization:

```typescript
new Document({ filename, fileSize, mimeType, status? })
```

## API Design

**Location**: `src/server/routes/documents.ts`

The Document API uses tRPC procedures with Zod validation for type-safe, end-to-end operations.

### Endpoints

#### `documents.list` (Query)
Retrieves all documents from the database.

- **Input**: None
- **Output**: Array of Document entities

#### `documents.upload` (Mutation)
Creates a new document record.

- **Input** (validated with Zod):
  - `filename`: string (1-255 characters)
  - `mimeType`: must be an allowed MIME type
  - `fileSize`: positive number, max 10MB
  - `data`: base64-encoded file content
- **Output**: Created Document with status `'uploaded'`

#### `documents.get` (Query)
Retrieves a specific document by ID.

- **Input**: `{ id: number }`
- **Output**: Document entity
- **Error**: Throws if document not found

#### `documents.delete` (Mutation)
Removes a document from the database.

- **Input**: `{ id: number }`
- **Output**: `{ success: true }`
- **Error**: Throws if document not found

## Validation Rules

**Location**: `src/shared/documents.ts`

### File Size Constraints
- **Maximum**: 10MB (10,485,760 bytes)
- **Minimum**: Must be positive

### Allowed MIME Types
- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/gif`
- `text/plain`
- `application/msword` (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)

## Frontend Integration

**Location**: `src/frontend/components/DocumentUpload.tsx`

The frontend uses tRPC React Query hooks for seamless API integration:

- `trpc.documents.list.useQuery()` - Fetches and caches document list
- `trpc.documents.upload.useMutation()` - Handles file uploads with automatic cache invalidation

### Upload Flow
1. User selects a file
2. Client-side validation checks file type and size
3. File is converted to base64
4. tRPC mutation sends the upload request
5. On success, the document list query is invalidated and refreshes

## Database Integration

- Uses MikroORM with SQLite
- Table name: `document` (auto-generated from entity class)
- Request context middleware provides isolated EntityManager per HTTP request
- Operations use `ctx.orm.em` for database access

## File Upload Architecture: Tradeoffs

This application uses a **tRPC + Base64** approach for file uploads. Here's how it compares to the traditional **Express + Multer + FormData** approach.

### Current Approach: tRPC + Base64

**How it works:**
1. Frontend uses `FileReader.readAsDataURL()` to convert file to base64 string
2. Base64 string is sent as JSON payload via tRPC mutation
3. Server receives and processes the JSON data

**Pros:**
- Simple, consistent architecture - everything goes through tRPC
- Full end-to-end type safety with Zod validation
- No additional dependencies (multer, etc.)
- Works well for metadata-only storage (current use case)
- Automatic integration with React Query caching

**Cons:**
- ~33% larger payload due to base64 encoding
- Entire file must be loaded into memory before sending
- Not suitable for large files (blocks JSON parser)
- No streaming support

### Alternative: Express + Multer + FormData

**How it works:**
1. Frontend creates `FormData` object and appends file
2. `fetch()` sends multipart/form-data to a dedicated Express route
3. Multer middleware parses the multipart request and saves file to disk

**Pros:**
- Efficient binary transfer (no encoding overhead)
- Streaming support for large files
- Industry-standard approach for file uploads
- Can save files directly to disk or cloud storage

**Cons:**
- Requires separate Express route alongside tRPC
- Loses tRPC type safety for upload endpoint
- Additional dependency (multer)
- Two different API patterns to maintain

### When to Use Which

| Scenario | Recommended Approach |
|----------|---------------------|
| Metadata-only storage | tRPC + Base64 (current) |
| Small files (<5MB) | Either works |
| Large files (>10MB) | Express + Multer |
| Need file storage on disk | Express + Multer |
| Want consistent tRPC API | tRPC + Base64 |
| Production file uploads | Express + Multer or Presigned URLs |

### Other Patterns

**Presigned URLs (S3/Cloud Storage):**
- tRPC generates a presigned upload URL
- Client uploads directly to cloud storage
- Client notifies server of completion
- Best for: Production apps with cloud infrastructure
