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

The try/catch in the upload mutation wraps errors with a custom message:
```typescript
throw new Error(`Upload failed: ${error.message}`);
```

This provides a user-friendly prefix, which can be useful for:
- Distinguishing upload errors from other API errors in client logs
- Providing consistent error message format across the upload flow

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
