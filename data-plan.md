# OpenRouter.ai PDF Data Extraction - Simplified Plan

## Goal
User uploads PDF → Save PDF → Extract text → Send to OpenRouter.ai → Store structured data → View in `/documents/:id` (PDF viewer + extracted data side panel)

## Flow
```
PDF Upload → Save PDF → Extract Text → OpenRouter API → Save ExtractedData → View /documents/:id
```

## Implementation Plan

### Phase 1: Update Document Schema

**Modify**: `src/server/entities/Document.ts`
- Add `extractedData?: ExtractedData` - Parsed results from OpenRouter
- Add `storedPath?: string` - Filesystem path or key for serving the PDF

**Modify**: `src/shared/documents.ts`
- Add `ExtractedData` interface:
```typescript
export interface ExtractedData {
  documentType: string;      // "invoice", "receipt", "contract"
  vendor: string;            // Company/person name
  amount?: number;           // Total amount
  date: string;              // ISO date string
  description: string;       // Brief description
  lineItems?: Array<{
    description: string;
    amount: number;
  }>;
}
```
- Add new status values: `'processing'`, `'parsed'`, `'parse_error'`

### Phase 2: PDF File Storage + Serving

**Create**: `src/server/services/file-storage.ts`
- Save PDF to `uploads/{documentId}/`
- Sanitize file names and keep paths inside the uploads directory
- Provide `saveFile()` and `getFilePath()` helpers

**Modify**: `src/server/server.ts`
- Add `GET /api/documents/:id/file` route to stream the PDF
- Set `Content-Type: application/pdf`
- Support `Range` requests for in-browser PDF viewers

**Configuration**:
- Add `UPLOADS_DIR` to `.env` (optional) with a default like `./uploads`
- Add `/uploads` to `.gitignore`

### Phase 3: PDF Text Extraction

**Install**: `npm install pdf-parse dotenv`

**Create**: `src/server/services/pdf-extractor.ts`
- Function: `extractTextFromPDF(fileBuffer: Buffer): Promise<string>`
- Uses `pdf-parse` library to extract text from PDF buffer
- Returns plain text content

### Phase 4: OpenRouter API Integration

**Create**: `.env` file (add to `.gitignore`)
```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

**Create**: `src/server/config/env.ts`
- Load environment variables using dotenv
- Export `OPENROUTER_API_KEY`

**Create**: `src/server/services/openrouter.ts`
- Function: `extractDataFromText(text: string): Promise<ExtractedData>`
- Uses your exact OpenRouter fetch code
- Prompt includes ExtractedData schema
- Returns parsed structured data

### Phase 5: Update Upload Endpoint

**Modify**: `src/server/routes/documents.ts`

Update the `upload` mutation to:
1. Create Document record (status: `'uploading'`)
2. Save PDF to disk using `file-storage.ts` and store `storedPath`
3. Extract text from PDF using `extractTextFromPDF()`
4. Update status to `'processing'`
5. Call `extractDataFromText()` with extracted text
6. Save `extractedData` to document
7. Update status to `'parsed'`
8. On error: set status to `'parse_error'`

**Flow in upload mutation**:
```typescript
const document = new Document({ filename, mimeType, fileSize });
await ctx.orm.em.persistAndFlush(document);

try {
  // Save PDF and extract text
  const fileBuffer = await input.file.arrayBuffer();
  await fileStorage.saveFile(document.id, file.name, Buffer.from(fileBuffer));
  const text = await extractTextFromPDF(Buffer.from(fileBuffer));

  // Send to OpenRouter
  document.status = 'processing';
  await ctx.orm.em.flush();

  const extractedData = await extractDataFromText(text);

  // Save results
  document.extractedData = extractedData;
  document.status = 'parsed';
  await ctx.orm.em.flush();

  return document;
} catch (error) {
  document.status = 'parse_error';
  await ctx.orm.em.flush();
  throw error;
}
```

### Phase 6: Frontend Display

**Modify**: `src/frontend/components/DocumentUpload.tsx`

1. Update status badges to show `'processing'`, `'parsed'`, `'parse_error'`
2. Create component to display extracted data
3. Show loading state during processing
4. Display structured data when status is `'parsed'`:
   - Document Type
   - Vendor
   - Amount (formatted as currency)
   - Date (formatted)
   - Description
   - Line Items table

### Phase 7: Document Detail View (`/documents/:id`)

**Install**: `npm install react-router-dom`

**Create**: `src/frontend/components/DocumentDetail.tsx`
- Fetch document details via `trpc.documents.get`
- Render PDF viewer (using `<object>` or `<iframe>` pointing to `/api/documents/:id/file`)
- Render extracted data in a fixed side panel

**Modify**: `src/frontend/App.tsx`
- Add React Router and route `/documents/:id`
- Link each document card in the list to its detail view

## Files to Create/Modify

**Create (5 files)**:
1. `src/server/config/env.ts` - Environment configuration
2. `src/server/services/pdf-extractor.ts` - PDF text extraction
3. `src/server/services/openrouter.ts` - OpenRouter API integration
4. `src/server/services/file-storage.ts` - PDF storage helpers
5. `src/frontend/components/DocumentDetail.tsx` - PDF viewer + extracted data

**Modify (6 files)**:
1. `src/server/entities/Document.ts` - Add `extractedData` field
2. `src/shared/documents.ts` - Add `ExtractedData` interface and new statuses
3. `src/server/routes/documents.ts` - Integrate PDF extraction and OpenRouter
4. `src/frontend/components/DocumentUpload.tsx` - Display extracted data
5. `src/server/server.ts` - Add file serving route
6. `src/frontend/App.tsx` - Add `/documents/:id` route

**Configuration**:
- `.env` - Add `OPENROUTER_API_KEY`
- `.gitignore` - Add `.env` and `/uploads`
- `package.json` - Add `pdf-parse`, `dotenv`, and `react-router-dom`

## Key Points

**Simple approach**:
- ✅ Upload PDF (already working)
- ✅ Save PDF to disk for viewing
- ✅ Extract text from PDF buffer (pdf-parse library)
- ✅ Send text to OpenRouter API (your fetch code)
- ✅ Store structured results in Document entity
- ✅ Display in UI

**Not doing**:
- ❌ No OCR for scanned PDFs (only text-based PDFs)
- ❌ No background jobs (synchronous processing)
- ❌ No image support (PDF only for now)

## Implementation Steps

1. Install: `npm install pdf-parse dotenv react-router-dom`
2. Create `.env` with OpenRouter API key
3. Add `.env` to `.gitignore`
4. Create `env.ts` - load environment variables
5. Create `file-storage.ts` - save PDFs and serve them by ID
6. Create `pdf-extractor.ts` - extract text from PDF
7. Create `openrouter.ts` - call OpenRouter API
8. Update `Document.ts` - add `extractedData` and `storedPath`
9. Update `documents.ts` (shared) - add types and statuses
10. Update `routes/documents.ts` - integrate extraction flow
11. Update `DocumentUpload.tsx` - display results
12. Add `DocumentDetail.tsx` and `/documents/:id` route

## Verification

Test with sample invoice PDF:
1. Upload PDF through UI
2. Status shows "Processing..."
3. Backend extracts text from PDF
4. Backend calls OpenRouter API
5. Status changes to "Parsed"
6. UI displays extracted data:
   - Document Type: "invoice"
   - Vendor: "Acme Corp"
   - Amount: $500.00
   - Date: 1/15/2024
   - Description: "..."
   - Line Items: list of items with amounts
7. Document detail view loads `/documents/:id` with PDF and side panel data
