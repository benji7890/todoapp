import { z } from 'zod';
import { zfd } from 'zod-form-data';
import { Document } from '../entities/Document';
import { router, publicProcedure } from '../trpc-base';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, DOCUMENT_STATUS, AllowedMimeType } from '../../shared/documents';
import { saveFile } from '../services/file-storage';
import { extractTextFromPDF } from '../services/pdf-extractor';
import { extractDataFromText } from '../services/openrouter';

const uploadInput = zfd.formData({
  file: zfd.file()
    .refine((f) => f.size <= MAX_FILE_SIZE, {
      message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    })
    .refine((f) => (ALLOWED_MIME_TYPES as readonly string[]).includes(f.type), {
      message: `File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
});

const idInput = z.object({ id: z.number() });

export const documentsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.orm.em.find(Document, {});
  }),

  get: publicProcedure
    .input(idInput)
    .query(async ({ input, ctx }) => {
      return await ctx.orm.em.findOneOrFail(Document, input.id);
    }),

  upload: publicProcedure
    .input(uploadInput)
    .mutation(async ({ input, ctx }) => {
      const file = input.file;

      // Create document with default UPLOADING status
      const document = new Document({
        filename: file.name,
        mimeType: file.type as AllowedMimeType,
        fileSize: file.size,
        // status defaults to UPLOADING via constructor
      });
      await ctx.orm.em.persistAndFlush(document);

      try {
        // Convert file to buffer
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Save PDF to disk
        const storedPath = await saveFile(document.id!, file.name, fileBuffer);
        document.storedPath = storedPath;
        await ctx.orm.em.flush();

        // Only process PDFs for text extraction
        if (file.type === 'application/pdf') {
          // Extract text from PDF
          const text = await extractTextFromPDF(fileBuffer);

          // Update status to processing
          document.status = DOCUMENT_STATUS.PROCESSING;
          await ctx.orm.em.flush();

          // Send to OpenRouter for data extraction
          const extractedData = await extractDataFromText(text);

          // Save extracted data and mark as parsed
          document.extractedData = extractedData;
          document.status = DOCUMENT_STATUS.PARSED;
          await ctx.orm.em.flush();
        } else {
          // For non-PDF files, just mark as uploaded
          document.status = DOCUMENT_STATUS.UPLOADED;
          await ctx.orm.em.flush();
        }

        return document;
      } catch (error) {
        // On failure, mark as PARSE_ERROR or ERROR
        if (document.storedPath) {
          // File was saved but processing failed
          document.status = DOCUMENT_STATUS.PARSE_ERROR;
        } else {
          // File save failed
          document.status = DOCUMENT_STATUS.ERROR;
        }
        await ctx.orm.em.flush();
        throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
    
  delete: publicProcedure
    .input(idInput)
    .mutation(async ({ input, ctx }) => {
      const document = await ctx.orm.em.findOneOrFail(Document, input.id);
      await ctx.orm.em.removeAndFlush(document);
      return { success: true };
    }),
});
