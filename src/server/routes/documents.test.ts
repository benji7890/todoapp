import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { setupTestDb, clearTestDb, closeTestDb } from '../test-utils/setup';
import { createTestCaller, type TestCaller } from '../test-utils/trpc-test-utils';
import { Document } from '../entities/Document';

describe('Document tRPC Endpoints', () => {
  let orm: MikroORM;
  let caller: TestCaller;

  beforeAll(async () => {
    orm = await setupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    caller = createTestCaller(orm);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const runInContext = async (fn: () => Promise<void>) => {
    await RequestContext.create(orm.em, fn);
  };

  describe('documents.list', () => {
    it('should return empty list when no documents exist', async () => {
      await runInContext(async () => {
        const result = await caller.documents.list();
        expect(result).toEqual([]);
      });
    });

    it('should return all documents when they exist', async () => {
      await runInContext(async () => {
        const doc1 = new Document({ filename: 'file1.pdf', fileSize: 1024, mimeType: 'application/pdf' });
        const doc2 = new Document({ filename: 'file2.txt', fileSize: 512, mimeType: 'text/plain' });
        await orm.em.persistAndFlush([doc1, doc2]);

        const result = await caller.documents.list();

        expect(result).toHaveLength(2);
        expect(result[0].filename).toBe('file1.pdf');
        expect(result[0].mimeType).toBe('application/pdf');
        expect(result[1].filename).toBe('file2.txt');
      });
    });
  });

  describe('documents.upload', () => {
    it('should upload a document with all fields', async () => {
      await runInContext(async () => {
        const result = await caller.documents.upload({
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          data: 'base64encodeddata',
        });

        expect(result.filename).toBe('test.pdf');
        expect(result.mimeType).toBe('application/pdf');
        expect(result.fileSize).toBe(2048);
        expect(result.status).toBe('uploaded');
        expect(result.id).toBeDefined();
        expect(result.uploadedAt).toBeDefined();
      });
    });

    it('should fail with empty filename', async () => {
      await runInContext(async () => {
        await expect(
          caller.documents.upload({
            filename: '',
            mimeType: 'application/pdf',
            fileSize: 1024,
            data: 'base64data',
          })
        ).rejects.toThrow();
      });
    });

    it('should fail with invalid fileSize', async () => {
      await runInContext(async () => {
        await expect(
          caller.documents.upload({
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            fileSize: -1,
            data: 'base64data',
          })
        ).rejects.toThrow();
      });
    });

    it('should persist document to database', async () => {
      await runInContext(async () => {
        await caller.documents.upload({
          filename: 'persisted.pdf',
          mimeType: 'application/pdf',
          fileSize: 4096,
          data: 'base64data',
        });

        const documents = await orm.em.find(Document, {});
        expect(documents).toHaveLength(1);
        expect(documents[0].filename).toBe('persisted.pdf');
      });
    });

    it('should reject file exceeding 10MB', async () => {
      await runInContext(async () => {
        const oversizedFileSize = 11 * 1024 * 1024; // 11MB
        await expect(
          caller.documents.upload({
            filename: 'large.pdf',
            mimeType: 'application/pdf',
            fileSize: oversizedFileSize,
            data: 'base64data',
          })
        ).rejects.toThrow();
      });
    });

    it('should reject disallowed MIME type', async () => {
      await runInContext(async () => {
        await expect(
          caller.documents.upload({
            filename: 'malware.exe',
            mimeType: 'application/x-msdownload' as any,
            fileSize: 1024,
            data: 'base64data',
          })
        ).rejects.toThrow();
      });
    });

    it('should accept allowed MIME types', async () => {
      await runInContext(async () => {
        const allowedTypes = [
          { filename: 'doc.pdf', mimeType: 'application/pdf' },
          { filename: 'image.jpg', mimeType: 'image/jpeg' },
          { filename: 'image.png', mimeType: 'image/png' },
          { filename: 'doc.txt', mimeType: 'text/plain' },
        ];

        for (const { filename, mimeType } of allowedTypes) {
          const result = await caller.documents.upload({
            filename,
            mimeType: mimeType as any,
            fileSize: 1024,
            data: 'base64data',
          });
          expect(result.mimeType).toBe(mimeType);
        }
      });
    });

    it('should reject filename over 255 characters', async () => {
      await runInContext(async () => {
        const longFilename = 'a'.repeat(256) + '.pdf';
        await expect(
          caller.documents.upload({
            filename: longFilename,
            mimeType: 'application/pdf',
            fileSize: 1024,
            data: 'base64data',
          })
        ).rejects.toThrow();
      });
    });

    // Edge case tests
    it('should accept file exactly at 10MB boundary', async () => {
      await runInContext(async () => {
        const exactlyMaxSize = 10 * 1024 * 1024; // Exactly 10MB
        const result = await caller.documents.upload({
          filename: 'exact-limit.pdf',
          mimeType: 'application/pdf',
          fileSize: exactlyMaxSize,
          data: 'base64data',
        });

        expect(result.fileSize).toBe(exactlyMaxSize);
        expect(result.status).toBe('uploaded');
      });
    });

    it('should reject file at 10MB + 1 byte', async () => {
      await runInContext(async () => {
        const justOverMaxSize = 10 * 1024 * 1024 + 1; // 10MB + 1 byte
        await expect(
          caller.documents.upload({
            filename: 'over-limit.pdf',
            mimeType: 'application/pdf',
            fileSize: justOverMaxSize,
            data: 'base64data',
          })
        ).rejects.toThrow();
      });
    });

    it('should handle unicode characters in filename', async () => {
      await runInContext(async () => {
        const unicodeFilename = '文档测试_日本語_émoji🎉.pdf';
        const result = await caller.documents.upload({
          filename: unicodeFilename,
          mimeType: 'application/pdf',
          fileSize: 1024,
          data: 'base64data',
        });

        expect(result.filename).toBe(unicodeFilename);
      });
    });

    it('should accept filename exactly at 255 characters', async () => {
      await runInContext(async () => {
        // 255 chars total including .pdf extension
        const maxFilename = 'a'.repeat(251) + '.pdf';
        expect(maxFilename.length).toBe(255);

        const result = await caller.documents.upload({
          filename: maxFilename,
          mimeType: 'application/pdf',
          fileSize: 1024,
          data: 'base64data',
        });

        expect(result.filename).toBe(maxFilename);
      });
    });

    it('should handle filename with special characters', async () => {
      await runInContext(async () => {
        const specialFilename = 'file-with_special (1) [copy].pdf';
        const result = await caller.documents.upload({
          filename: specialFilename,
          mimeType: 'application/pdf',
          fileSize: 1024,
          data: 'base64data',
        });

        expect(result.filename).toBe(specialFilename);
      });
    });

    it('should reject zero file size', async () => {
      await runInContext(async () => {
        await expect(
          caller.documents.upload({
            filename: 'empty.pdf',
            mimeType: 'application/pdf',
            fileSize: 0,
            data: '',
          })
        ).rejects.toThrow();
      });
    });

    it('should handle filename with leading/trailing spaces', async () => {
      await runInContext(async () => {
        // Depending on implementation, this might be trimmed or rejected
        const result = await caller.documents.upload({
          filename: '  spaced-file.pdf  ',
          mimeType: 'application/pdf',
          fileSize: 1024,
          data: 'base64data',
        });

        // Should either trim or accept as-is
        expect(result.filename).toBeDefined();
      });
    });

    it('should accept all allowed Word document MIME types', async () => {
      await runInContext(async () => {
        // Test legacy .doc format
        const doc = await caller.documents.upload({
          filename: 'legacy.doc',
          mimeType: 'application/msword' as any,
          fileSize: 1024,
          data: 'base64data',
        });
        expect(doc.mimeType).toBe('application/msword');

        // Test modern .docx format
        const docx = await caller.documents.upload({
          filename: 'modern.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as any,
          fileSize: 1024,
          data: 'base64data',
        });
        expect(docx.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      });
    });

    it('should accept GIF images', async () => {
      await runInContext(async () => {
        const result = await caller.documents.upload({
          filename: 'animation.gif',
          mimeType: 'image/gif' as any,
          fileSize: 2048,
          data: 'base64data',
        });

        expect(result.mimeType).toBe('image/gif');
      });
    });
  });

  describe('documents.get', () => {
    it('should return document by id', async () => {
      await runInContext(async () => {
        const doc = new Document({ filename: 'get-test.pdf', fileSize: 1024, mimeType: 'application/pdf' });
        await orm.em.persistAndFlush(doc);

        const result = await caller.documents.get({ id: doc.id! });

        expect(result.id).toBe(doc.id);
        expect(result.filename).toBe('get-test.pdf');
        expect(result.fileSize).toBe(1024);
      });
    });

    it('should throw error for non-existent id', async () => {
      await runInContext(async () => {
        await expect(
          caller.documents.get({ id: 999 })
        ).rejects.toThrow();
      });
    });
  });

  describe('documents.delete', () => {
    let testDoc: Document;

    beforeEach(async () => {
      await runInContext(async () => {
        testDoc = new Document({ filename: 'to-delete.pdf', fileSize: 1024, mimeType: 'application/pdf' });
        await orm.em.persistAndFlush(testDoc);
      });
    });

    it('should delete document and return success', async () => {
      await runInContext(async () => {
        const result = await caller.documents.delete({ id: testDoc.id! });

        expect(result.success).toBe(true);
      });
    });

    it('should remove document from database', async () => {
      await runInContext(async () => {
        await caller.documents.delete({ id: testDoc.id! });

        const documents = await orm.em.find(Document, {});
        expect(documents).toHaveLength(0);
      });
    });

    it('should throw error for non-existent id', async () => {
      await runInContext(async () => {
        await expect(
          caller.documents.delete({ id: 999 })
        ).rejects.toThrow();
      });
    });
  });
});
