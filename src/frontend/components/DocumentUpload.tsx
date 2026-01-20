import { useMemo, useState } from 'react';
import { trpc } from '../utils/trpc';
import {
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
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap' as const,
    alignItems: 'stretch',
    height: 'calc(100vh - 40px)',
  },
  column: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    height: '100%',
    boxSizing: 'border-box' as const,
  },
  listColumn: {
    width: '420px',
    flexShrink: 0,
    overflow: 'visible',
    overflowY: 'auto' as const,
  },
  reviewColumn: {
    flex: '1 1 600px',
    minWidth: '320px',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
  },
  documentCard: {
    padding: '12px',
    marginBottom: '12px',
    borderWidth: '1px',
    borderStyle: 'solid' as const,
    borderColor: '#e6e6e6',
    borderRadius: '8px',
    backgroundColor: '#fff',
    outline: 'none',
  },
  documentCardSelected: {
    borderColor: '#007bff',
    boxShadow: '0 0 0 1px #007bff',
    outline: 'none',
  },
  documentCardContent: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  documentTitle: {
    margin: '0 0 6px 0',
  },
  documentMeta: {
    margin: '0',
    color: '#666',
    fontSize: '13px',
  },
  documentDate: {
    color: '#999',
    fontSize: '12px',
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '6px',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
  },
  viewButton: {
    padding: '6px 10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  reviewLayout: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap' as const,
    flex: 1,
    minHeight: 0,
  },
  viewerContainer: {
    flex: '1 1 480px',
    minHeight: 0,
    height: '100%',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  viewerFrame: {
    width: '100%',
    height: '100%',
    border: 'none',
    backgroundColor: '#525659',
  },
  sidePanel: {
    width: '320px',
    flexShrink: 0,
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#fff',
    height: '100%',
    overflowY: 'auto' as const,
  },
  sidePanelHeader: {
    marginBottom: '12px',
  },
  sidePanelTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
  },
  sidePanelMeta: {
    margin: '4px 0',
    color: '#666',
    fontSize: '13px',
  },
  extractedDataContainer: {
    marginTop: '15px',
    padding: '12px',
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
  finishButton: {
    marginTop: '16px',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  finishButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  emptyState: {
    border: '1px dashed #ccc',
    borderRadius: '8px',
    padding: '24px',
    color: '#666',
    textAlign: 'center' as const,
    backgroundColor: '#fafafa',
  },
  noDocuments: {
    color: '#666',
  },
  errorText: {
    marginTop: '10px',
    color: '#dc3545',
    fontSize: '13px',
  },
} as const;

const statusStyles: Record<DocumentStatus, { backgroundColor: string; color: string }> = {
  [DOCUMENT_STATUS.UPLOADING]: { backgroundColor: '#cce5ff', color: '#004085' },
  [DOCUMENT_STATUS.UPLOADED]: { backgroundColor: '#d4edda', color: '#155724' },
  [DOCUMENT_STATUS.PROCESSING]: { backgroundColor: '#fff3cd', color: '#856404' },
  [DOCUMENT_STATUS.REVIEW]: { backgroundColor: '#e7f3ff', color: '#0056b3' },
  [DOCUMENT_STATUS.COMPLETED]: { backgroundColor: '#d1e7dd', color: '#0f5132' },
  [DOCUMENT_STATUS.ERROR]: { backgroundColor: '#f8d7da', color: '#721c24' },
};

const statusMessages: Record<DocumentStatus, string> = {
  [DOCUMENT_STATUS.UPLOADING]: 'Uploading...',
  [DOCUMENT_STATUS.UPLOADED]: 'Uploaded',
  [DOCUMENT_STATUS.PROCESSING]: 'Processing...',
  [DOCUMENT_STATUS.REVIEW]: 'Review',
  [DOCUMENT_STATUS.COMPLETED]: 'Completed',
  [DOCUMENT_STATUS.ERROR]: 'Error',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    <span
      style={{
        ...styles.statusBadge,
        ...style,
      }}
    >
      {statusMessages[status]}
    </span>
  );
}

interface ExtractedDataDisplayProps {
  data: ExtractedData;
}

function ExtractedDataDisplay({ data }: ExtractedDataDisplayProps) {
  return (
    <div style={styles.extractedDataContainer}>
      <h5 style={styles.extractedDataTitle}>Extracted Data</h5>

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
        <span style={styles.extractedDataValue}>{data.date}</span>
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
  document: Document;
  isSelected: boolean;
  onReview: (id: number) => void;
}

function DocumentCard({ document, isSelected, onReview }: DocumentCardProps) {
  const canView = document.mimeType === 'application/pdf' && Boolean(document.storedPath);
  const viewLabel = 'View';

  const handleOpen = () => {
    if (canView) {
      onReview(document.id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canView) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onReview(document.id);
    }
  };

  return (
    <div
      style={{
        ...styles.documentCard,
        ...(isSelected ? styles.documentCardSelected : {}),
        ...(canView ? { cursor: 'pointer' } : {}),
      }}
      onClick={canView ? handleOpen : undefined}
      onMouseDown={canView ? (event) => event.preventDefault() : undefined}
      onKeyDown={canView ? handleKeyDown : undefined}
      role={canView ? 'button' : undefined}
      tabIndex={canView ? 0 : undefined}
    >
      <div style={styles.documentCardContent}>
        <div style={{ flex: 1 }}>
          <h4 style={styles.documentTitle}>{document.filename}</h4>
          <p style={styles.documentMeta}>
            {formatFileSize(document.fileSize)} • {document.mimeType}
          </p>
          <small style={styles.documentDate}>
            Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
          </small>
        </div>
        <div style={styles.cardActions}>
          <StatusBadge status={document.status} />
          {canView && (
            <button
              type="button"
              style={styles.viewButton}
              onClick={() => onReview(document.id)}
            >
              {viewLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function DocumentUpload() {
  const [reviewDocumentId, setReviewDocumentId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const documentsQuery = trpc.documents.list.useQuery(undefined, {
    refetchInterval: (query) => {
      const list = query.state.data as Document[] | undefined;
      if (!list) return false;
      const shouldPoll = list.some(
        (doc) =>
          doc.status === DOCUMENT_STATUS.UPLOADING ||
          doc.status === DOCUMENT_STATUS.PROCESSING
      );
      return shouldPoll ? 2000 : false;
    },
  });
  const updateStatusMutation = trpc.documents.updateStatus.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
    },
  });

  const documents = useMemo(() => {
    const list = documentsQuery.data as Document[] | undefined;
    if (!list) return [];
    return [...list].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [documentsQuery.data]);

  const reviewDocument = documents.find((doc) => doc.id === reviewDocumentId) || null;

  const handleFinishReview = async () => {
    if (!reviewDocument) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: reviewDocument.id,
        status: DOCUMENT_STATUS.COMPLETED,
      });
    } catch {
      // Error surfaced via updateStatusMutation.error
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ ...styles.column, ...styles.listColumn }}>
        <h2 style={styles.sectionTitle}>Documents</h2>

        {documentsQuery.isLoading ? (
          <p>Loading documents...</p>
        ) : documentsQuery.error ? (
          <p style={{ color: 'red' }}>Error: {documentsQuery.error.message}</p>
        ) : documents.length === 0 ? (
          <p style={styles.noDocuments}>No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={doc.id === reviewDocumentId}
              onReview={setReviewDocumentId}
            />
          ))
        )}
      </div>

      <div style={{ ...styles.column, ...styles.reviewColumn }}>
        <h2 style={styles.sectionTitle}>Review</h2>

        {reviewDocument ? (
          <div style={styles.reviewLayout}>
            <div style={styles.viewerContainer}>
              {reviewDocument.mimeType === 'application/pdf' && reviewDocument.storedPath ? (
                <iframe
                  src={`/api/documents/${reviewDocument.id}/file`}
                  style={styles.viewerFrame}
                  title={reviewDocument.filename}
                />
              ) : (
                <div style={{ padding: '24px' }}>
                  <p>PDF viewer is only available for PDF files.</p>
                </div>
              )}
            </div>

            <div style={styles.sidePanel}>
              <div style={styles.sidePanelHeader}>
                <h3 style={styles.sidePanelTitle}>{reviewDocument.filename}</h3>
                <StatusBadge status={reviewDocument.status} />
                <p style={styles.sidePanelMeta}>
                  Uploaded: {new Date(reviewDocument.uploadedAt).toLocaleString()}
                </p>
                <p style={styles.sidePanelMeta}>
                  Size: {formatFileSize(reviewDocument.fileSize)}
                </p>
              </div>

              {reviewDocument.extractedData ? (
                <ExtractedDataDisplay data={reviewDocument.extractedData} />
              ) : reviewDocument.status === DOCUMENT_STATUS.PROCESSING ? (
                <p>Processing document...</p>
              ) : reviewDocument.status === DOCUMENT_STATUS.ERROR ? (
                <>
                  <p>Unable to extract data for this document.</p>
                  {updateStatusMutation.error && (
                    <p style={styles.errorText}>{updateStatusMutation.error.message}</p>
                  )}
                </>
              ) : (
                <p>No extracted data available.</p>
              )}

              <button
                type="button"
                onClick={handleFinishReview}
                disabled={
                  updateStatusMutation.isPending ||
                  reviewDocument.status !== DOCUMENT_STATUS.REVIEW
                }
                style={{
                  ...styles.finishButton,
                  ...(updateStatusMutation.isPending ||
                  reviewDocument.status !== DOCUMENT_STATUS.REVIEW
                    ? styles.finishButtonDisabled
                    : {}),
                }}
              >
                {updateStatusMutation.isPending
                  ? 'Saving...'
                  : reviewDocument.status === DOCUMENT_STATUS.COMPLETED
                  ? 'Approved'
                  : 'Approve'}
              </button>

            </div>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>Select a document with status "Ready for review" to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentUpload;
