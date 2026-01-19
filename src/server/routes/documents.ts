import { z } from 'zod';
import { Document } from '../entities/Document';
import { router, publicProcedure } from '../trpc-base';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, DOCUMENT_STATUS } from '../../shared/documents';

const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: `File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` }),
  }),
  fileSize: z.number().positive().max(MAX_FILE_SIZE, {
    message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  }),
  data: z.string(),
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
      // Create document with default UPLOADING status
      const document = new Document({
        filename: input.filename,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        // status defaults to UPLOADING via constructor
      });
      await ctx.orm.em.persistAndFlush(document);

      try {
        // After processing, mark as UPLOADED
        document.status = DOCUMENT_STATUS.UPLOADED;
        await ctx.orm.em.flush();
        return document;
      } catch (error) {
        // On failure, mark as ERROR
        document.status = DOCUMENT_STATUS.ERROR;
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
