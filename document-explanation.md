# Document Entity and API Design

This document explains the Document entity structure and how the Document API is designed in this application.

## Document Entity

**Location**: `src/server/entities/Document.ts`

The Document entity represents uploaded files stored in the system. It uses MikroORM decorators for database mapping.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | number? | Primary key (auto-generated, optional before persistence) |
| `filename` | string | Name of the uploaded file |
| `fileSize` | number | File size in bytes |
| `mimeType` | AllowedMimeType | MIME type of the file (typed union from shared constants) |
| `uploadedAt` | Date | Timestamp when the document was uploaded (auto-set in constructor) |
| `status` | DocumentStatus | Current status: `'uploading'`, `'uploaded'`, or `'error'` (defaults to `'uploading'`) |

### Entity Initialization

Documents are created using constructor-based initialization:

```typescript
new Document({
  filename: string;
  fileSize: number;
  mimeType: AllowedMimeType;
  status?: DocumentStatus; // Optional, defaults to DOCUMENT_STATUS.UPLOADING
})
```

The `uploadedAt` timestamp is automatically set to `new Date()` in the constructor, and the `status` defaults to `DOCUMENT_STATUS.UPLOADING` if not provided.

## API Design

**Location**: `src/server/routes/documents.ts`

The Document API uses tRPC procedures with Zod validation for type-safe, end-to-end operations.

### Endpoints

#### `documents.list` (Query)
Retrieves all documents from the database.

- **Input**: None
- **Output**: Array of Document entities

#### `documents.upload` (Mutation)
Handles file upload with validation and status tracking.

- **Input**: `FormData` containing a `file` field (validated with `zod-form-data`)
  - File size: max 10MB (validated via Zod refine)
  - MIME type: must be in `ALLOWED_MIME_TYPES` (validated via Zod refine)
- **Process**:
  1. Creates Document with `status: 'uploading'` (default from constructor)
  2. Persists document to database immediately
  3. Updates status to `'uploaded'` after successful processing
  4. On error, updates status to `'error'` and re-throws
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
3. File is wrapped in `FormData` object
4. tRPC mutation routes through `httpLink` (via `splitLink` detecting non-JSON input)
5. Backend validates with `zod-form-data` schema
6. Document created with `status: 'uploading'` and persisted
7. Status updated to `'uploaded'` on success or `'error'` on failure
8. On success, the document list query is invalidated and refreshes

## Database Integration

- Uses MikroORM with SQLite
- Table name: `document` (auto-generated from entity class)
- Request context middleware provides isolated EntityManager per HTTP request
- Operations use `ctx.orm.em` for database access

## File Upload Architecture: tRPC Native FormData

This application uses **tRPC v11's native FormData support** with `zod-form-data` for file uploads. This provides the best of both worlds: type-safe tRPC procedures with efficient binary file transfer.

### Current Approach: tRPC + FormData + zod-form-data

**How it works:**

1. **Frontend** (`src/frontend/components/DocumentUpload.tsx`) creates a `FormData` object and appends the file:
   ```typescript
   const formData = new FormData();
   formData.append('file', selectedFile);
   await uploadMutation.mutateAsync(formData);
   ```

2. **tRPC Client** (`src/frontend/main.tsx`) uses `splitLink` to route FormData requests through `httpLink` (not batched):
   ```typescript
   import { httpBatchLink, httpLink, splitLink, isNonJsonSerializable } from '@trpc/client';

   const trpcClient = trpc.createClient({
     links: [
       splitLink({
         condition: (op) => isNonJsonSerializable(op.input),
         true: httpLink({ url: '/api/trpc' }),
         false: httpBatchLink({ url: '/api/trpc' }),
       }),
     ],
   });
   ```

3. **Backend** (`src/server/routes/documents.ts`) validates with `zod-form-data` schema:
   ```typescript
   import { zfd } from 'zod-form-data';
   import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../../shared/documents';

   const uploadInput = zfd.formData({
     file: zfd.file()
       .refine((f) => f.size <= MAX_FILE_SIZE, {
         message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
       })
       .refine((f) => (ALLOWED_MIME_TYPES as readonly string[]).includes(f.type), {
         message: `File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
       }),
   });
   ```

4. **Handler** receives a native `File` object and manages status transitions:
   ```typescript
   upload: publicProcedure
     .input(uploadInput)
     .mutation(async ({ input, ctx }) => {
       const file = input.file;

       // Create with UPLOADING status (default)
       const document = new Document({
         filename: file.name,
         mimeType: file.type as AllowedMimeType,
         fileSize: file.size,
       });
       await ctx.orm.em.persistAndFlush(document);

       try {
         // Mark as UPLOADED after processing
         document.status = DOCUMENT_STATUS.UPLOADED;
         await ctx.orm.em.flush();
         return document;
       } catch (error) {
         // Mark as ERROR on failure
         document.status = DOCUMENT_STATUS.ERROR;
         await ctx.orm.em.flush();
         throw new Error(`Upload failed: ${error.message}`);
       }
     })
   ```

**Pros:**
- Unified tRPC API - all endpoints use the same pattern
- Full end-to-end type safety with Zod validation
- Native browser FormData - no encoding overhead
- Efficient binary transfer (no 33% base64 bloat)
- Automatic React Query integration

**Cons:**
- Requires `zod-form-data` dependency
- Requires `splitLink` configuration for non-JSON routing
- Still loads entire file into memory (no streaming)
- Not suitable for very large files (>50MB typically)

### Why FormData over Base64?

| Aspect | FormData | Base64 |
|--------|----------|--------|
| **Payload size** | Actual file size | ~33% larger |
| **Encoding** | None needed | FileReader.readAsDataURL() |
| **Type safety** | Full via zfd | Full via Zod |
| **Browser API** | Native FormData | FileReader API |
| **Memory** | File object | String in memory |

### Alternative: Express + Multer

For very large files or streaming requirements, you could use Multer:

**How it works:**
1. Frontend creates `FormData` and uses `fetch()` to a dedicated Express route
2. Multer middleware parses multipart request and saves to disk
3. Supports streaming for large files

**When to consider:**
- Files consistently > 50MB
- Need direct disk streaming
- Memory-constrained environment

**Tradeoff:** Loses tRPC type safety for upload endpoint, requires maintaining two API patterns.

### Other Patterns

**Presigned URLs (S3/Cloud Storage):**
- tRPC generates a presigned upload URL
- Client uploads directly to cloud storage
- Client notifies server of completion
- Best for: Production apps with cloud infrastructure, very large files

## Production File Upload Architecture

For a real-world application handling file uploads at scale, here's how the service could be designed:

### Recommended Architecture: Presigned URL Flow

```
┌─────────┐    1. Request upload URL     ┌─────────┐
│ Client  │ ──────────────────────────▶  │ Backend │
│         │                              │ (tRPC)  │
│         │  ◀────────────────────────── │         │
│         │    2. Return presigned URL   │         │
│         │       + document ID          │         │
└────┬────┘                              └────┬────┘
     │                                        │
     │ 3. Upload directly to S3               │ 2a. Create document
     │    (bypasses backend)                  │     record (status: pending)
     ▼                                        ▼
┌─────────┐                              ┌─────────┐
│   S3    │ ────── 4. S3 Event ────────▶ │   SQS   │
│ Bucket  │                              │  Queue  │
└─────────┘                              └────┬────┘
                                              │
                                              │ 5. Process event
                                              ▼
                                         ┌─────────┐
                                         │ Worker  │
                                         │ Lambda  │
                                         └────┬────┘
                                              │
                                              │ 6. Update document status
                                              │    Run virus scan, etc.
                                              ▼
                                         ┌─────────┐
                                         │   DB    │
                                         └─────────┘
```

### Why This Architecture?

| Concern | Solution |
|---------|----------|
| **Large files** | Client uploads directly to S3, no server memory pressure |
| **Scalability** | Backend only handles metadata, not file bytes |
| **Security** | Presigned URLs expire, files go to private bucket |
| **Reliability** | S3 handles upload retries, chunked uploads |
| **Cost** | Less compute needed on application servers |

### Key Components

**1. Upload Request Endpoint (tRPC)**
```typescript
requestUpload: publicProcedure
  .input(z.object({
    filename: z.string(),
    mimeType: z.enum(ALLOWED_MIME_TYPES),
    fileSize: z.number().max(MAX_FILE_SIZE),
  }))
  .mutation(async ({ input, ctx }) => {
    // Create pending document record
    const document = new Document({
      filename: input.filename,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      status: 'pending',
    });
    await ctx.orm.em.persistAndFlush(document);

    // Generate presigned URL (expires in 15 minutes)
    const presignedUrl = await s3.getSignedUrl('putObject', {
      Bucket: 'uploads-bucket',
      Key: `uploads/${document.id}/${input.filename}`,
      ContentType: input.mimeType,
      Expires: 900,
    });

    return { documentId: document.id, uploadUrl: presignedUrl };
  }),
```

**2. S3 Event Processing (Lambda/Worker)**
- Triggered when file lands in S3
- Runs virus scanning (ClamAV or commercial solution)
- Validates file content matches declared MIME type
- Updates document status to 'uploaded' or 'error'
- Optionally generates thumbnails, extracts text, etc.

**3. Serving Files**
- Use CloudFront CDN with signed URLs for downloads
- Set appropriate cache headers
- Consider separate buckets for public vs private files

### Additional Production Considerations

**Security:**
- Virus/malware scanning before marking as uploaded
- Content-Type validation (don't trust client-declared MIME type)
- File size limits enforced at S3 level too
- Private bucket with no public access
- Audit logging for compliance

**Reliability:**
- Multipart uploads for large files (S3 handles automatically)
- Dead letter queue for failed processing
- Idempotent processing (handle duplicate S3 events)
- Cleanup job for abandoned uploads (pending status > 24h)

**Performance:**
- CDN for frequently accessed files
- Different storage tiers (S3 Intelligent-Tiering for cost optimization)
- Async processing for heavy operations (thumbnails, OCR)

**Monitoring:**
- Track upload success/failure rates
- Alert on virus scan detections
- Monitor S3 costs and storage growth
- Track processing queue depth

## Error Handling: Why Try/Catch Is Often Unnecessary

The `upload` mutation in `documents.ts` includes a try/catch block, but this is generally not necessary in tRPC procedures. Here's why:

### tRPC's Built-in Error Handling

tRPC automatically catches errors thrown in procedures and:
1. Converts them to proper HTTP error responses
2. Preserves error messages for client-side handling
3. Handles both expected errors (validation, not found) and unexpected errors (database failures)

### When Try/Catch Adds Value

The try/catch in the upload mutation serves two purposes:
1. **Status management**: Ensures the document status is set to `'error'` if processing fails
2. **Error enrichment**: Wraps errors with a custom message:
   ```typescript
   throw new Error(`Upload failed: ${error.message}`);
   ```

This provides:
- Proper error state tracking in the database
- User-friendly error message prefix
- Distinguishable upload errors in client logs
- Consistent error message format across the upload flow

### When to Skip Try/Catch

For simpler procedures like `get` and `delete`, try/catch is omitted because:
- `findOneOrFail` already throws a descriptive error when the entity isn't found
- tRPC propagates these errors correctly to the client
- Adding try/catch would just add noise without improving error handling

### Recommendation

Use try/catch in tRPC procedures only when you need to:
- Transform or enrich error messages
- Perform cleanup actions on failure
- Convert errors between types (e.g., database errors to TRPCError)

For straightforward database operations, let tRPC handle errors automatically.

---

# Interview Guide: Explaining Document Entity and API Design

This section provides a structured guide for explaining the Document implementation to an interviewer. The explanation is broken into digestible points for clear communication and learning.

## 1. High-Level Architecture Choice

**What to say:**
> "I used tRPC with native FormData support for file uploads. This gives us end-to-end type safety while efficiently handling binary files—no base64 encoding overhead, just native browser FormData sent directly to the backend."

**Why it matters:**
- Shows you understand the tradeoff between type safety and performance
- Demonstrates knowledge of modern full-stack patterns

## 2. Entity Design with MikroORM

**What to say:**
> "The Document entity uses MikroORM decorators for database mapping. It tracks six fields: id (auto-generated), filename, fileSize, mimeType (strongly typed from shared constants), uploadedAt (auto-set in constructor), and status for lifecycle tracking."

**Key implementation detail:**
```typescript
constructor(params: {
  filename: string;
  fileSize: number;
  mimeType: AllowedMimeType;
  status?: DocumentStatus
}) {
  this.uploadedAt = new Date();
  this.status = params.status ?? DOCUMENT_STATUS.UPLOADING;
}
```

**Why it matters:**
- Constructor-based initialization ensures consistency
- Auto-setting `uploadedAt` eliminates human error
- Default status of `'uploading'` enables status tracking from the start

## 3. Status Lifecycle Management

**What to say:**
> "Documents follow a three-state lifecycle: 'uploading' → 'uploaded' or 'error'. The entity is persisted immediately with status 'uploading', then updated to 'uploaded' after processing succeeds, or 'error' if it fails. This gives us a reliable audit trail."

**Implementation flow:**
```typescript
// 1. Create and persist with UPLOADING status
const document = new Document({ filename, mimeType, fileSize });
await ctx.orm.em.persistAndFlush(document);

// 2. Process, then update status
try {
  document.status = DOCUMENT_STATUS.UPLOADED;
  await ctx.orm.em.flush();
} catch (error) {
  document.status = DOCUMENT_STATUS.ERROR;
  await ctx.orm.em.flush();
  throw error;
}
```

**Why it matters:**
- Database always reflects current state
- Failed uploads leave a record (not lost)
- Enables retry logic or cleanup jobs

## 4. Type-Safe Validation with Zod

**What to say:**
> "Validation uses zod-form-data with two refinements: file size max 10MB, and MIME type must be in our allowlist. These shared constants live in `src/shared/documents.ts` so frontend and backend use identical rules—one source of truth."

**Code example:**
```typescript
const uploadInput = zfd.formData({
  file: zfd.file()
    .refine((f) => f.size <= MAX_FILE_SIZE, { message: '...' })
    .refine((f) => ALLOWED_MIME_TYPES.includes(f.type), { message: '...' })
});
```

**Why it matters:**
- Prevents drift between client/server validation
- Type-safe at compile time
- User-friendly error messages

## 5. Client-Side Routing with splitLink

**What to say:**
> "The tRPC client uses splitLink to route FormData requests through httpLink instead of httpBatchLink. This is necessary because FormData isn't JSON-serializable, so it can't be batched with other requests."

**Implementation:**
```typescript
const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => isNonJsonSerializable(op.input),
      true: httpLink({ url: '/api/trpc' }),      // FormData goes here
      false: httpBatchLink({ url: '/api/trpc' }) // JSON batched here
    }),
  ],
});
```

**Why it matters:**
- Optimizes network: JSON requests batched, FormData sent individually
- Demonstrates understanding of tRPC internals
- Shows thoughtful performance consideration

## 6. API Surface Design

**What to say:**
> "The API exposes four endpoints: `list` (get all documents), `get` (fetch by ID), `upload` (create with file), and `delete` (remove by ID). I kept it RESTful-style even within tRPC because it's familiar and predictable."

**Endpoint signatures:**
- `documents.list` → `Document[]`
- `documents.get({ id })` → `Document`
- `documents.upload(FormData)` → `Document`
- `documents.delete({ id })` → `{ success: true }`

**Why it matters:**
- Clear, intuitive API surface
- Follows conventions (queries for reads, mutations for writes)
- Easy to extend later

## 7. Error Handling Strategy

**What to say:**
> "I only use try/catch in the upload mutation because it needs to update document status on failure. For simpler operations like get and delete, I let tRPC's built-in error handling do its job—MikroORM's `findOneOrFail` already throws descriptive errors."

**When to use try/catch:**
- ✅ Need to update state on failure (status management)
- ✅ Need to enrich error messages
- ❌ Simple CRUD where framework errors are sufficient

**Why it matters:**
- Shows you don't over-engineer
- Understand framework capabilities
- Pragmatic error handling philosophy

## 8. Production Considerations (Bonus Points)

**What to say:**
> "For production, I'd move to presigned URLs with S3: client requests upload URL from backend, uploads directly to S3, then S3 event triggers a Lambda to scan for viruses and update document status. This keeps file bytes off application servers and scales better."

**Why it matters:**
- Shows you think beyond MVP
- Understanding of cloud architecture
- Security awareness (virus scanning)

---

## Interview Communication Tips

### Start Broad, Then Zoom In

1. **Opening**: "The system uses tRPC + FormData for type-safe file uploads"
2. **Architecture**: "The Document entity tracks six fields with status lifecycle management"
3. **Validation**: "Validation uses zod-form-data with shared constants"
4. **Details**: Then dive into specific implementation details if asked

### Be Ready to Explain Tradeoffs

**Why FormData over base64?**
- 33% smaller payload (no base64 encoding overhead)
- Native browser API (no FileReader required)
- Better performance for large files

**Why persist with 'uploading' status immediately?**
- Creates audit trail of all upload attempts
- Enables retry logic for failed uploads
- Can build cleanup jobs for abandoned uploads

**Why zod-form-data instead of Multer?**
- Unified tRPC API across all endpoints
- End-to-end type safety
- Consistent validation pattern

**What if files are >50MB?**
- Switch to presigned URLs + direct S3 upload
- Keeps application servers stateless
- Better scalability and reliability

### Show Code Fluency

Reference specific files and line numbers to demonstrate deep codebase knowledge:

- "In `src/server/entities/Document.ts:24-30`, the constructor auto-sets uploadedAt..."
- "The splitLink config is in `src/frontend/main.tsx:12-17`..."
- "Shared validation constants are defined in `src/shared/documents.ts:1-11`..."
- "The upload mutation at `src/server/routes/documents.ts:30-55` manages the status lifecycle..."

This demonstrates you know the codebase deeply, not just conceptually.

### Highlight Key Design Decisions

**Shared Constants Pattern:**
> "Notice that `MAX_FILE_SIZE` and `ALLOWED_MIME_TYPES` live in `src/shared/` and are imported by both frontend and backend. This prevents validation drift—if we update allowed file types, both client and server automatically sync."

**Status Lifecycle:**
> "The status field isn't just a string—it's a typed union from `DOCUMENT_STATUS` constants. TypeScript ensures we can only assign valid states, preventing typos like 'uploading' vs 'UPLOADING'."

**Entity Manager Context:**
> "I use `ctx.orm.em` directly without manual forking because MikroORM's request context middleware creates an isolated EntityManager per HTTP request. This prevents transaction leakage between requests."

### Address Potential Questions

**"Why not just use Multer?"**
> "Multer would work, but then we'd have two different API patterns—tRPC for everything else, Express routes for uploads. Using tRPC's FormData support keeps the API unified and maintains type safety end-to-end."

**"How do you handle concurrent uploads?"**
> "Each upload gets its own database transaction via MikroORM's request context. SQLite handles concurrent writes through its locking mechanism. For production with high concurrency, I'd switch to PostgreSQL."

**"What about file storage?"**
> "Currently, we only store metadata—filename, size, MIME type. For actual file storage, I'd use S3 with presigned URLs in production. The document ID would map to the S3 object key."

**"How do you prevent malicious files?"**
> "We validate MIME type and file size, but client-declared MIME types can't be fully trusted. In production, I'd add server-side content validation (magic number checking) and virus scanning via ClamAV or a cloud service."

### Demonstrate Growth Mindset

End with areas for improvement:

> "If I had more time, I'd add:
> - Server-side MIME type verification using magic numbers
> - Progress tracking for large uploads using tRPC subscriptions
> - Automatic cleanup job for documents stuck in 'uploading' status
> - Integration tests using Playwright to test the full upload flow
> - Rate limiting to prevent abuse"

This shows you think critically about production readiness and security.
