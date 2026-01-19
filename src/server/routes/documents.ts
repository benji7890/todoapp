import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { Document } from '../entities/Document';
import type { Context } from '../trpc';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, DOCUMENT_STATUS } from '../../shared/documents';

const t = initTRPC.context<Context>().create();
const router = t.router;
const publicProcedure = t.procedure;

export const documentsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.orm.em.find(Document, {});
  }),

  upload: publicProcedure
    .input(z.object({
      filename: z.string().min(1).max(255),
      mimeType: z.enum(ALLOWED_MIME_TYPES, {
        errorMap: () => ({ message: `File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` }),
      }),
      fileSize: z.number().positive().max(MAX_FILE_SIZE, {
        message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }),
      data: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const document = new Document({
          filename: input.filename,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          status: DOCUMENT_STATUS.UPLOADED,
        });
        await ctx.orm.em.persistAndFlush(document);
        return document;
      } catch (error) {
        throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  get: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      return await ctx.orm.em.findOneOrFail(Document, input.id);
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const document = await ctx.orm.em.findOneOrFail(Document, input.id);
      await ctx.orm.em.removeAndFlush(document);
      return { success: true };
    }),
});
