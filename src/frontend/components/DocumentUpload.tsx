import { useState, useRef } from 'react';
import { trpc } from '../utils/trpc';
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  AllowedMimeType,
  DOCUMENT_STATUS,
  DocumentStatus,
  Document,
} from '../../shared/documents';

// =============================================================================
// Styles
// =============================================================================

const styles = {
  container: {
    maxWidth: '800px',
  },
  uploadSection: {
    marginBottom: '30px',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  fileInput: {
    marginBottom: '10px',
  },
  selectedFileText: {
    margin: '10px 0',
    color: '#666',
  },
  errorText: {
    margin: '10px 0',
    color: 'red',
  },
  uploadButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  documentCard: {
    padding: '15px',
    margin: '10px 0',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  documentCardContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentTitle: {
    margin: '0 0 5px 0',
  },
  documentMeta: {
    margin: '0',
    color: '#666',
    fontSize: '14px',
  },
  documentDate: {
    color: '#999',
  },
  noDocuments: {
    color: '#666',
  },
} as const;

const statusStyles: Record<DocumentStatus, { backgroundColor: string; color: string }> = {
  [DOCUMENT_STATUS.UPLOADING]: { backgroundColor: '#cce5ff', color: '#004085' },
  [DOCUMENT_STATUS.UPLOADED]: { backgroundColor: '#d4edda', color: '#155724' },
  [DOCUMENT_STATUS.ERROR]: { backgroundColor: '#f8d7da', color: '#721c24' },
};

const statusMessages: Record<DocumentStatus, string> = {
  [DOCUMENT_STATUS.UPLOADING]: 'Uploading...',
  [DOCUMENT_STATUS.UPLOADED]: 'Upload successful!',
  [DOCUMENT_STATUS.ERROR]: 'Upload failed',
};

// =============================================================================
// Helper Functions
// =============================================================================

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedMimeType(type: string): type is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

function resetFileInput(ref: React.RefObject<HTMLInputElement | null>) {
  if (ref.current) {
    ref.current.value = '';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

interface StatusBadgeProps {
  status: DocumentStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status];
  return (
    <p
      style={{
        margin: '10px 0',
        padding: '8px 12px',
        borderRadius: '4px',
        ...style,
      }}
    >
      {statusMessages[status]}
    </p>
  );
}

interface DocumentCardProps {
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  status: string;
}

function DocumentCard({ filename, fileSize, mimeType, uploadedAt, status }: DocumentCardProps) {
  const isUploaded = status === DOCUMENT_STATUS.UPLOADED;

  return (
    <div style={styles.documentCard}>
      <div style={styles.documentCardContent}>
        <div>
          <h4 style={styles.documentTitle}>{filename}</h4>
          <p style={styles.documentMeta}>
            {formatFileSize(fileSize)} • {mimeType}
          </p>
          <small style={styles.documentDate}>
            Uploaded: {new Date(uploadedAt).toLocaleDateString()}
          </small>
        </div>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: isUploaded ? '#d4edda' : '#fff3cd',
            color: isUploaded ? '#155724' : '#856404',
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function DocumentUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<DocumentStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentsQuery = trpc.documents.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation();
  const utils = trpc.useUtils();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isAllowedMimeType(file.type)) {
      setError(`File type "${file.type}" is not allowed. Please select a PDF, image, text, or Word document.`);
      setSelectedFile(null);
      resetFileInput(fileInputRef);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      setSelectedFile(null);
      resetFileInput(fileInputRef);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError(null);
    setUploadStatus(DOCUMENT_STATUS.UPLOADING);

    try {
      const base64Data = await readFileAsBase64(selectedFile);

      await uploadMutation.mutateAsync({
        filename: selectedFile.name,
        mimeType: selectedFile.type as AllowedMimeType,
        fileSize: selectedFile.size,
        data: base64Data,
      });

      setUploadStatus(DOCUMENT_STATUS.UPLOADED);
      setSelectedFile(null);
      resetFileInput(fileInputRef);
      utils.documents.list.invalidate();

      setTimeout(() => setUploadStatus(null), 2000);
    } catch (err) {
      setUploadStatus(DOCUMENT_STATUS.ERROR);
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const isUploadDisabled = !selectedFile || uploadMutation.isPending;

  return (
    <div style={styles.container}>
      {/* Upload Section */}
      <div style={styles.uploadSection}>
        <h3>Upload Document</h3>
        <div style={{ marginBottom: '10px' }}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept={ALLOWED_MIME_TYPES.join(',')}
            style={styles.fileInput}
          />

          {selectedFile && (
            <p style={styles.selectedFileText}>
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}

          {error && <p style={styles.errorText}>{error}</p>}

          {uploadStatus && <StatusBadge status={uploadStatus} />}
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploadDisabled}
          style={{
            ...styles.uploadButton,
            opacity: isUploadDisabled ? 0.6 : 1,
          }}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Documents List Section */}
      <div>
        <h3>Uploaded Documents</h3>
        <DocumentsList
          isLoading={documentsQuery.isLoading}
          error={documentsQuery.error}
          documents={documentsQuery.data as Document[] | undefined}
        />
      </div>
    </div>
  );
}

interface DocumentsListProps {
  isLoading: boolean;
  error: { message: string } | null;
  documents: Document[] | undefined;
}

function DocumentsList({ isLoading, error, documents }: DocumentsListProps) {
  if (isLoading) {
    return <p>Loading documents...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error.message}</p>;
  }

  if (!documents?.length) {
    return <p style={styles.noDocuments}>No documents uploaded yet.</p>;
  }

  return (
    <div>
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          filename={doc.filename}
          fileSize={doc.fileSize}
          mimeType={doc.mimeType}
          uploadedAt={doc.uploadedAt}
          status={doc.status}
        />
      ))}
    </div>
  );
}

export default DocumentUpload;
