export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const DOCUMENT_STATUS = {
  UPLOADING: 'uploading',
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  REVIEW: 'review',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

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

export interface Document {
  id: number;
  filename: string;
  fileSize: number;
  mimeType: AllowedMimeType;
  uploadedAt: Date;
  status: DocumentStatus;
  extractedData?: ExtractedData;
  storedPath?: string;
}
