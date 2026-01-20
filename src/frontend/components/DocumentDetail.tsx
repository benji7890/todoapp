import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import { DOCUMENT_STATUS, ExtractedData } from '../../shared/documents';

// =============================================================================
// Styles
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 100px)',
    gap: '20px',
    padding: '20px',
  },
  pdfViewerContainer: {
    flex: '1',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  pdfViewerHeader: {
    padding: '15px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pdfFrame: {
    flex: 1,
    border: 'none',
    width: '100%',
    backgroundColor: '#525659',
  },
  sidePanel: {
    width: '400px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    overflowY: 'auto' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  documentTitle: {
    margin: '0 0 10px 0',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  documentMeta: {
    margin: '5px 0',
    color: '#666',
    fontSize: '14px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  divider: {
    margin: '20px 0',
    border: 'none',
    borderTop: '1px solid #ddd',
  },
  extractedDataSection: {
    marginTop: '20px',
  },
  extractedDataTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#0c5460',
  },
  dataField: {
    margin: '12px 0',
  },
  dataLabel: {
    display: 'block',
    fontWeight: 'bold',
    color: '#555',
    fontSize: '13px',
    marginBottom: '4px',
  },
  dataValue: {
    display: 'block',
    color: '#333',
    fontSize: '14px',
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
    fontSize: '12px',
  },
  lineItemsCell: {
    padding: '8px',
    borderBottom: '1px solid #dee2e6',
    fontSize: '13px',
  },
  errorContainer: {
    padding: '40px 20px',
    textAlign: 'center' as const,
  },
  errorText: {
    color: '#dc3545',
    fontSize: '16px',
  },
  loadingContainer: {
    padding: '40px 20px',
    textAlign: 'center' as const,
  },
  noDataMessage: {
    padding: '15px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    color: '#856404',
    fontSize: '14px',
  },
} as const;

const statusStyles: Record<string, { backgroundColor: string; color: string }> = {
  [DOCUMENT_STATUS.UPLOADING]: { backgroundColor: '#cce5ff', color: '#004085' },
  [DOCUMENT_STATUS.UPLOADED]: { backgroundColor: '#d4edda', color: '#155724' },
  [DOCUMENT_STATUS.PROCESSING]: { backgroundColor: '#fff3cd', color: '#856404' },
  [DOCUMENT_STATUS.PARSED]: { backgroundColor: '#d1ecf1', color: '#0c5460' },
  [DOCUMENT_STATUS.PARSE_ERROR]: { backgroundColor: '#f8d7da', color: '#721c24' },
  [DOCUMENT_STATUS.ERROR]: { backgroundColor: '#f8d7da', color: '#721c24' },
};

const statusMessages: Record<string, string> = {
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

// =============================================================================
// Sub-Components
// =============================================================================

interface ExtractedDataDisplayProps {
  data: ExtractedData;
}

function ExtractedDataDisplay({ data }: ExtractedDataDisplayProps) {
  return (
    <div style={styles.extractedDataSection}>
      <h3 style={styles.extractedDataTitle}>📄 Extracted Data</h3>

      <div style={styles.dataField}>
        <span style={styles.dataLabel}>Document Type</span>
        <span style={styles.dataValue}>{data.documentType}</span>
      </div>

      <div style={styles.dataField}>
        <span style={styles.dataLabel}>Vendor</span>
        <span style={styles.dataValue}>{data.vendor}</span>
      </div>

      {data.amount !== undefined && (
        <div style={styles.dataField}>
          <span style={styles.dataLabel}>Amount</span>
          <span style={styles.dataValue}>${data.amount.toFixed(2)}</span>
        </div>
      )}

      <div style={styles.dataField}>
        <span style={styles.dataLabel}>Date</span>
        <span style={styles.dataValue}>
          {new Date(data.date).toLocaleDateString()}
        </span>
      </div>

      <div style={styles.dataField}>
        <span style={styles.dataLabel}>Description</span>
        <span style={styles.dataValue}>{data.description}</span>
      </div>

      {data.lineItems && data.lineItems.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <span style={styles.dataLabel}>Line Items</span>
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

// =============================================================================
// Main Component
// =============================================================================

function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const documentQuery = trpc.documents.get.useQuery(
    { id: parseInt(id || '0', 10) },
    { enabled: !!id }
  );

  if (documentQuery.isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading document...</p>
      </div>
    );
  }

  if (documentQuery.error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>Error: {documentQuery.error.message}</p>
        <button
          style={styles.backButton}
          onClick={() => navigate('/')}
        >
          ← Back to Documents
        </button>
      </div>
    );
  }

  const document = documentQuery.data;

  if (!document) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>Document not found</p>
        <button
          style={styles.backButton}
          onClick={() => navigate('/')}
        >
          ← Back to Documents
        </button>
      </div>
    );
  }

  const statusStyle = statusStyles[document.status] || statusStyles[DOCUMENT_STATUS.UPLOADED];
  const isPDF = document.mimeType === 'application/pdf';

  return (
    <div style={styles.container}>
      {/* PDF Viewer */}
      <div style={styles.pdfViewerContainer}>
        <div style={styles.pdfViewerHeader}>
          <button
            style={styles.backButton}
            onClick={() => navigate('/')}
          >
            ← Back to Documents
          </button>
          <h2 style={{ margin: 0, fontSize: '18px' }}>{document.filename}</h2>
          <div style={{ width: '150px' }} /> {/* Spacer for centering */}
        </div>

        {isPDF && document.storedPath ? (
          <iframe
            src={`/api/documents/${document.id}/file`}
            style={styles.pdfFrame}
            title={document.filename}
          />
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>PDF viewer is only available for PDF files.</p>
            {document.storedPath && (
              <a
                href={`/api/documents/${document.id}/file`}
                download={document.filename}
                style={{ color: '#007bff', textDecoration: 'underline' }}
              >
                Download {document.filename}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Side Panel */}
      <div style={styles.sidePanel}>
        <h3 style={styles.documentTitle}>{document.filename}</h3>

        <p style={styles.documentMeta}>
          <strong>Size:</strong> {formatFileSize(document.fileSize)}
        </p>

        <p style={styles.documentMeta}>
          <strong>Type:</strong> {document.mimeType}
        </p>

        <p style={styles.documentMeta}>
          <strong>Uploaded:</strong> {new Date(document.uploadedAt).toLocaleString()}
        </p>

        <span
          style={{
            ...styles.statusBadge,
            ...statusStyle,
          }}
        >
          {statusMessages[document.status]}
        </span>

        <hr style={styles.divider} />

        {/* Display extracted data if available */}
        {document.extractedData && document.status === DOCUMENT_STATUS.PARSED ? (
          <ExtractedDataDisplay data={document.extractedData} />
        ) : document.status === DOCUMENT_STATUS.PROCESSING ? (
          <div style={styles.noDataMessage}>
            ⏳ Document is being processed. Extracted data will appear here once processing is complete.
          </div>
        ) : document.status === DOCUMENT_STATUS.PARSE_ERROR ? (
          <div style={styles.noDataMessage}>
            ⚠️ Failed to extract data from this document.
          </div>
        ) : !isPDF ? (
          <div style={styles.noDataMessage}>
            ℹ️ Data extraction is only available for PDF files.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DocumentDetail;
