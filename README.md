# Document Review App (tRPC + MikroORM)

![PDF viewer sample](sample_image/pdf-viewer-sample.png)

A full-stack TypeScript app for uploading PDFs, extracting structured data with OpenRouter, and reviewing documents side-by-side with a PDF viewer.

## Features

- **Upload + Review workflow**: Upload PDFs, watch status updates, and approve extracted data.
- **Split-view review UI**: Documents list, PDF viewer, and extracted data panel.
- **Type-safe API**: tRPC end-to-end types with Zod validation.
- **SQLite + MikroORM**: Local database storage.
- **File storage**: Uploaded files saved under `./uploads`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your `.env` file (required for OpenRouter):
   ```bash
   OPENROUTER_API_KEY=your_api_key_here
   ```
   Optional:
   ```bash
   UPLOADS_DIR=./uploads
   ```

3. Start the servers:
   ```bash
   npm run dev
   npm run dev:client
   ```

4. Open http://localhost:5173

## OpenRouter API Key

This app uses OpenRouter for document extraction. You must supply your own API key in a local `.env` file:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

Do not commit your `.env` file.

## Scripts

- `npm run dev` - Start Express server
- `npm run dev:client` - Start React development server
- `npm run build` - Build React app for production
- `npm run preview` - Preview production build
- `npm test` - Run all tests
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
src/
  ├── server/
  │   ├── server.ts           # Express server with tRPC adapter
  │   ├── trpc.ts             # Main tRPC router configuration
  │   ├── entities/
  │   │   ├── Todo.ts         # Todo entity
  │   │   └── Document.ts     # Document entity
  │   ├── routes/
  │   │   ├── todos.ts        # Todo endpoints
  │   │   └── documents.ts    # Document upload/review endpoints
  │   └── services/
  │       ├── file-storage.ts # Upload storage helpers
  │       ├── pdf-extractor.ts
  │       └── openrouter.ts
  └── frontend/
      ├── App.tsx             # Main app layout
      ├── main.tsx            # React entry point with providers
      └── components/
          ├── TodoApp.tsx
          └── DocumentUpload.tsx
```

## Notes

- PDFs are processed synchronously after upload.
- Only PDF files are extracted; non-PDF files remain in `UPLOADED` status.
