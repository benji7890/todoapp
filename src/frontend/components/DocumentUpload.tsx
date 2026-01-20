import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  DOCUMENT_STATUS,
  DocumentStatus,
  Document,
  ExtractedData,
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
  viewLink: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    marginLeft: '10px',
  },
  noDocuments: {
    color: '#666',
  },
  extractedDataContainer: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    borderLeft: '4px solid #0c5460',
  },
  extractedDataTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#0c5460',
  },
  extractedDataField: {
    margin: '8px 0',
    fontSize: '14px',
  },
  extractedDataLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  extractedDataValue: {
    marginLeft: '8px',
    color: '#333',
  },
  lineItemsTable: {
    width: '100%',
    marginTop: '10px',
    borderCollapse: 'collapse' as const,
  },
  lineItemsHeader: {
    backgroundColor: '#e9ecef',
    padding: '8px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    fontSize: '13px',
  },
  lineItemsCell: {
    padding: '8px',
    borderBottom: '1px solid #dee2e6',
    fontSize: '13px',
  },
} as const;

const statusStyles: Record<DocumentStatus, { backgroundColor: string; color: string }> = {
  [DOCUMENT_STATUS.UPLOADING]: { backgroundColor: '#cce5ff', color: '#004085' },
  [DOCUMENT_STATUS.UPLOADED]: { backgroundColor: '#d4edda', color: '#155724' },
  [DOCUMENT_STATUS.PROCESSING]: { backgroundColor: '#fff3cd', color: '#856404' },
  [DOCUMENT_STATUS.PARSED]: { backgroundColor: '#d1ecf1', color: '#0c5460' },
  [DOCUMENT_STATUS.PARSE_ERROR]: { backgroundColor: '#f8d7da', color: '#721c24' },
  [DOCUMENT_STATUS.ERROR]: { backgroundColor: '#f8d7da', color: '#721c24' },
};

const statusMessages: Record<DocumentStatus, string> = {
  [DOCUMENT_STATUS.UPLOADING]: 'Uploading...',
  [DOCUMENT_STATUS.UPLOADED]: 'Upload successful!',
  [DOCUMENT_STATUS.PROCESSING]: 'Processing...',
  [DOCUMENT_STATUS.PARSED]: 'Parsed successfully',
  [DOCUMENT_STATUS.PARSE_ERROR]: 'Parse failed',
  [DOCUMENT_STATUS.ERROR]: 'Upload failed',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedMimeType(type: string): boolean {
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

interface ExtractedDataDisplayProps {
  data: ExtractedData;
}

function ExtractedDataDisplay({ data }: ExtractedDataDisplayProps) {
  return (
    <div style={styles.extractedDataContainer}>
      <h5 style={styles.extractedDataTitle}>📄 Extracted Data</h5>

      <div style={styles.extractedDataField}>
        <span style={styles.extractedDataLabel}>Document Type:</span>
        <span style={styles.extractedDataValue}>{data.documentType}</span>
      </div>

      <div style={styles.extractedDataField}>
        <span style={styles.extractedDataLabel}>Vendor:</span>
        <span style={styles.extractedDataValue}>{data.vendor}</span>
      </div>

      {data.amount !== undefined && (
        <div style={styles.extractedDataField}>
          <span style={styles.extractedDataLabel}>Amount:</span>
          <span style={styles.extractedDataValue}>
            ${data.amount.toFixed(2)}
          </span>
        </div>
      )}

      <div style={styles.extractedDataField}>
        <span style={styles.extractedDataLabel}>Date:</span>
        <span style={styles.extractedDataValue}>
          {new Date(data.date).toLocaleDateString()}
        </span>
      </div>

      <div style={styles.extractedDataField}>
        <span style={styles.extractedDataLabel}>Description:</span>
        <span style={styles.extractedDataValue}>{data.description}</span>
      </div>

      {data.lineItems && data.lineItems.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <div style={styles.extractedDataLabel}>Line Items:</div>
          <table style={styles.lineItemsTable}>
            <thead>
              <tr>
                <th style={styles.lineItemsHeader}>Description</th>
                <th style={{ ...styles.lineItemsHeader, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, index) => (
                <tr key={index}>
                  <td style={styles.lineItemsCell}>{item.description}</td>
                  <td style={{ ...styles.lineItemsCell, textAlign: 'right' }}>
                    ${item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface DocumentCardProps {
  id: number;
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  status: string;
  extractedData?: ExtractedData;
}

function DocumentCard({ id, filename, fileSize, mimeType, uploadedAt, status, extractedData }: DocumentCardProps) {
  const statusStyle = statusStyles[status as DocumentStatus];

  return (
    <div style={styles.documentCard}>
      <div style={styles.documentCardContent}>
        <div style={{ flex: 1 }}>
          <h4 style={styles.documentTitle}>{filename}</h4>
          <p style={styles.documentMeta}>
            {formatFileSize(fileSize)} • {mimeType}
          </p>
          <small style={styles.documentDate}>
            Uploaded: {new Date(uploadedAt).toLocaleDateString()}
          </small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              ...statusStyle,
            }}
          >
            {statusMessages[status as DocumentStatus]}
          </span>
          <Link to={`/documents/${id}`} style={styles.viewLink}>
            View
          </Link>
        </div>
      </div>

      {/* Display extracted data if available and status is parsed */}
      {extractedData && status === DOCUMENT_STATUS.PARSED && (
        <ExtractedDataDisplay data={extractedData} />
      )}
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

  const validateAndSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const formData = new FormData();
      formData.append('file', selectedFile);

      await uploadMutation.mutateAsync(formData);

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
            onChange={validateAndSelectFile}
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
          id={doc.id}
          filename={doc.filename}
          fileSize={doc.fileSize}
          mimeType={doc.mimeType}
          uploadedAt={doc.uploadedAt}
          status={doc.status}
          extractedData={doc.extractedData}
        />
      ))}
    </div>
  );
}

export default DocumentUpload;
