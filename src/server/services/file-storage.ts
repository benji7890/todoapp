import * as fs from 'fs/promises';
import * as path from 'path';

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

/**
 * Sanitize filename to prevent directory traversal attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove any path components and dangerous characters
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Get the directory path for a document
 */
function getDocumentDir(documentId: number): string {
  return path.join(UPLOADS_DIR, documentId.toString());
}

/**
 * Save a file to the uploads directory
 * @param documentId - The document ID
 * @param filename - Original filename
 * @param buffer - File buffer
 * @returns The relative path where the file was stored
 */
export async function saveFile(documentId: number, filename: string, buffer: Buffer): Promise<string> {
  const sanitized = sanitizeFilename(filename);
  const dir = getDocumentDir(documentId);
  const filePath = path.join(dir, sanitized);

  // Create directory if it doesn't exist
  await fs.mkdir(dir, { recursive: true });

  // Save the file
  await fs.writeFile(filePath, buffer);

  // Return relative path from uploads directory
  return path.join(documentId.toString(), sanitized);
}

/**
 * Get the full filesystem path for a stored file
 * @param storedPath - The relative path stored in the database
 * @returns Full filesystem path
 */
export function getFilePath(storedPath: string): string {
  // Ensure the path stays within uploads directory
  const normalized = path.normalize(storedPath);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error('Invalid stored path');
  }

  return path.join(UPLOADS_DIR, normalized);
}

/**
 * Check if a file exists
 * @param storedPath - The relative path stored in the database
 * @returns True if the file exists
 */
export async function fileExists(storedPath: string): Promise<boolean> {
  try {
    const fullPath = getFilePath(storedPath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
