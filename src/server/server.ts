import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import config from './mikro-orm.config';
import { createAppRouter } from './trpc';
import * as fs from 'fs';
import { getFilePath, fileExists } from './services/file-storage';
import { Document } from './entities/Document';

const app = express();
const PORT = process.env.PORT || 3001;

async function bootstrap() {
  const orm = await MikroORM.init(config);
  await orm.getSchemaGenerator().ensureDatabase();
  await orm.getSchemaGenerator().updateSchema();

  app.use(express.static('dist'));

  // Add MikroORM request context middleware
  app.use((req, res, next) => {
    RequestContext.create(orm.em, next);
  });

  // PDF serving route with Range request support
  app.get('/api/documents/:id/file', async (req, res) => {
    try {
      const documentId = parseInt(req.params.id, 10);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      // Fetch document from database
      const document = await orm.em.findOne(Document, { id: documentId });
      if (!document || !document.storedPath) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if file exists
      if (!(await fileExists(document.storedPath))) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      const filePath = getFilePath(document.storedPath);
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      // Set content type
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Accept-Ranges', 'bytes');

      // Handle Range requests for PDF viewers
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);

        const stream = fs.createReadStream(filePath, { start, end });
        stream.pipe(res);
      } else {
        // Send entire file
        res.setHeader('Content-Length', fileSize);
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error('Error serving document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.use(
    '/api/trpc',
    trpcExpress.createExpressMiddleware({
      router: createAppRouter(),
      createContext: () => ({ orm }),
    })
  );

  app.listen(PORT, () => {
    console.log(`tRPC server running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);