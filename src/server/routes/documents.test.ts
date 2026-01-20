import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { setupTestDb, clearTestDb, closeTestDb } from '../test-utils/setup';
import { createTestCaller, type TestCaller } from '../test-utils/trpc-test-utils';
import { Document } from '../entities/Document';

// Helper to create FormData with a file for testing
function createTestFormData(filename: string, mimeType: string, size: number, content = 'test content'): FormData {
  const file = new File([content], filename, { type: mimeType });
  // Override size for testing size limits
  if (size !== content.length) {
    Object.defineProperty(file, 'size', { value: size });
  }
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

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
    it('should upload a document with FormData', async () => {
      await runInContext(async () => {
        const formData = createTestFormData('test.txt', 'text/plain', 12);

        const result = await caller.documents.upload(formData);

        expect(result.filename).toBe('test.txt');
        expect(result.mimeType).toBe('text/plain');
        expect(result.fileSize).toBe(12);
        expect(result.status).toBe('uploaded');
        expect(result.id).toBeDefined();
        expect(result.uploadedAt).toBeDefined();
      });
    });

    it('should persist document to database', async () => {
      await runInContext(async () => {
        const formData = createTestFormData('persisted.txt', 'text/plain', 12);
        await caller.documents.upload(formData);

        const documents = await orm.em.find(Document, {});
        expect(documents).toHaveLength(1);
        expect(documents[0].filename).toBe('persisted.txt');
      });
    });

    it('should reject file exceeding 10MB', async () => {
      await runInContext(async () => {
        const oversizedFileSize = 11 * 1024 * 1024; // 11MB
        const formData = createTestFormData('large.pdf', 'application/pdf', oversizedFileSize);

        await expect(caller.documents.upload(formData)).rejects.toThrow();
      });
    });

    it('should reject disallowed MIME type', async () => {
      await runInContext(async () => {
        const formData = createTestFormData('malware.exe', 'application/x-msdownload', 1024);

        await expect(caller.documents.upload(formData)).rejects.toThrow();
      });
    });

    it('should accept allowed MIME types', async () => {
      await runInContext(async () => {
        const allowedTypes = [
          { filename: 'image.jpg', mimeType: 'image/jpeg' },
          { filename: 'image.png', mimeType: 'image/png' },
          { filename: 'doc.txt', mimeType: 'text/plain' },
        ];

        for (const { filename, mimeType } of allowedTypes) {
          const formData = createTestFormData(filename, mimeType, 1024);
          const result = await caller.documents.upload(formData);
          expect(result.mimeType).toBe(mimeType);
        }
      });
    });

    it('should accept file exactly at 10MB boundary', async () => {
      await runInContext(async () => {
        const exactlyMaxSize = 10 * 1024 * 1024; // Exactly 10MB
        const formData = createTestFormData('exact-limit.txt', 'text/plain', exactlyMaxSize);

        const result = await caller.documents.upload(formData);

        expect(result.fileSize).toBe(exactlyMaxSize);
        expect(result.status).toBe('uploaded');
      });
    });

    it('should reject file at 10MB + 1 byte', async () => {
      await runInContext(async () => {
        const justOverMaxSize = 10 * 1024 * 1024 + 1; // 10MB + 1 byte
        const formData = createTestFormData('over-limit.pdf', 'application/pdf', justOverMaxSize);

        await expect(caller.documents.upload(formData)).rejects.toThrow();
      });
    });

    it('should handle unicode characters in filename', async () => {
      await runInContext(async () => {
        const unicodeFilename = '文档测试_日本語_émoji🎉.txt';
        const formData = createTestFormData(unicodeFilename, 'text/plain', 1024);

        const result = await caller.documents.upload(formData);

        expect(result.filename).toBe(unicodeFilename);
      });
    });

    it('should handle filename with special characters', async () => {
      await runInContext(async () => {
        const specialFilename = 'file-with_special (1) [copy].txt';
        const formData = createTestFormData(specialFilename, 'text/plain', 1024);

        const result = await caller.documents.upload(formData);

        expect(result.filename).toBe(specialFilename);
      });
    });

    it('should accept all allowed Word document MIME types', async () => {
      await runInContext(async () => {
        // Test legacy .doc format
        const docFormData = createTestFormData('legacy.doc', 'application/msword', 1024);
        const doc = await caller.documents.upload(docFormData);
        expect(doc.mimeType).toBe('application/msword');

        // Test modern .docx format
        const docxFormData = createTestFormData('modern.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1024);
        const docx = await caller.documents.upload(docxFormData);
        expect(docx.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      });
    });

    it('should accept GIF images', async () => {
      await runInContext(async () => {
        const formData = createTestFormData('animation.gif', 'image/gif', 2048);

        const result = await caller.documents.upload(formData);

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
