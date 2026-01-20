import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { mockStubs, resetAllMocks } from '../__mocks__/trpc';

// Mock the tRPC module
vi.mock('../utils/trpc', async () => {
  const mockModule = await import('../__mocks__/trpc');
  return mockModule;
});

import DocumentUpload from './DocumentUpload';

// Helper to create a test wrapper with QueryClient and Router
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

// Sample document data for testing
const mockDocuments = [
  {
    id: 1,
    filename: 'test-document.pdf',
    fileSize: 1024 * 500, // 500KB
    mimeType: 'application/pdf',
    uploadedAt: new Date('2024-01-15'),
    status: 'uploaded',
  },
  {
    id: 2,
    filename: 'image.png',
    fileSize: 1024 * 100, // 100KB
    mimeType: 'image/png',
    uploadedAt: new Date('2024-01-16'),
    status: 'uploaded',
  },
];

describe('DocumentUpload', () => {
  const mockListQuery = {
    data: [],
    isLoading: false,
    error: null,
  };

  const mockUploadMutationObj = {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  };

  const mockUtils = {
    documents: {
      list: {
        invalidate: vi.fn(),
      },
    },
    todos: {
      list: {
        invalidate: vi.fn(),
      },
    },
    client: {},
  };

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();

    mockStubs.documentsListUseQuery.returns(mockListQuery);
    mockStubs.documentsUploadUseMutation.returns(mockUploadMutationObj);
    mockStubs.useUtils.returns(mockUtils);
  });

  it('renders the document upload form with empty message', () => {
    render(<DocumentUpload />, { wrapper: createWrapper() });

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument();
  });

  it('shows loading state when documents are loading', () => {
    mockStubs.documentsListUseQuery.returns({
      ...mockListQuery,
      isLoading: true,
    });

    render(<DocumentUpload />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('shows error state when there is an error fetching documents', () => {
    mockStubs.documentsListUseQuery.returns({
      ...mockListQuery,
      error: { message: 'Failed to fetch documents' },
    });

    render(<DocumentUpload />, { wrapper: createWrapper() });

    expect(screen.getByText('Error: Failed to fetch documents')).toBeInTheDocument();
  });

  it('displays documents when they exist', () => {
    mockStubs.documentsListUseQuery.returns({
      ...mockListQuery,
      data: mockDocuments,
    });

    render(<DocumentUpload />, { wrapper: createWrapper() });

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByText(/500\.0 KB/)).toBeInTheDocument();
    expect(screen.getByText(/100\.0 KB/)).toBeInTheDocument();
  });

  it('disables upload button when no file is selected', () => {
    render(<DocumentUpload />, { wrapper: createWrapper() });

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    expect(uploadButton).toBeDisabled();
  });

  it('shows selected file info when a file is chosen', async () => {
    const user = userEvent.setup();
    render(<DocumentUpload />, { wrapper: createWrapper() });

    const file = new File(['test content'], 'test-file.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText(/Selected: test-file.pdf/)).toBeInTheDocument();
    });
  });

  it('enables upload button when a valid file is selected', async () => {
    const user = userEvent.setup();
    render(<DocumentUpload />, { wrapper: createWrapper() });

    const file = new File(['test content'], 'test-file.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      const uploadButton = screen.getByRole('button', { name: 'Upload' });
      expect(uploadButton).not.toBeDisabled();
    });
  });

  it('shows error for invalid file type', async () => {
    render(<DocumentUpload />, { wrapper: createWrapper() });

    const file = new File(['test content'], 'test-file.exe', { type: 'application/x-msdownload' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Directly set the files and trigger change event to bypass accept attribute
    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.getByText(/File type .* is not allowed/)).toBeInTheDocument();
    });
  });

  it('calls upload mutation with FormData when upload button is clicked', async () => {
    const user = userEvent.setup();
    mockUploadMutationObj.mutateAsync.mockResolvedValue({ id: 1 });

    render(<DocumentUpload />, { wrapper: createWrapper() });

    const file = new File(['test content'], 'test-file.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(mockUploadMutationObj.mutateAsync).toHaveBeenCalled();
      const calledArg = mockUploadMutationObj.mutateAsync.mock.calls[0][0];
      expect(calledArg).toBeInstanceOf(FormData);
      expect(calledArg.get('file')).toBeInstanceOf(File);
      expect((calledArg.get('file') as File).name).toBe('test-file.pdf');
    });
  });

  it('invalidates query and clears form after successful upload', async () => {
    const user = userEvent.setup();
    mockUploadMutationObj.mutateAsync.mockResolvedValue({ id: 1 });

    render(<DocumentUpload />, { wrapper: createWrapper() });

    const file = new File(['test content'], 'test-file.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(mockUtils.documents.list.invalidate).toHaveBeenCalled();
      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });
  });

  it('shows uploading state when mutation is pending', () => {
    mockStubs.documentsUploadUseMutation.returns({
      ...mockUploadMutationObj,
      isPending: true,
    });

    render(<DocumentUpload />, { wrapper: createWrapper() });

    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('displays document status badges', () => {
    mockStubs.documentsListUseQuery.returns({
      ...mockListQuery,
      data: mockDocuments,
    });

    render(<DocumentUpload />, { wrapper: createWrapper() });

    const statusBadges = screen.getAllByText('Upload successful!');
    expect(statusBadges).toHaveLength(2);
  });

  it('shows uploading status indicator during upload', async () => {
    const user = userEvent.setup();
    // Create a promise that we can control to simulate slow upload
    let resolveUpload: (value: unknown) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    mockUploadMutationObj.mutateAsync.mockReturnValue(uploadPromise);

    render(<DocumentUpload />, { wrapper: createWrapper() });

    const file = new File(['test content'], 'test-file.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);
    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(uploadButton);

    // Should show uploading status indicator
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    // Resolve the upload
    await act(async () => {
      resolveUpload!({ id: 1 });
    });

    // Should show success status
    await waitFor(() => {
      expect(screen.getByText('Upload successful!')).toBeInTheDocument();
    });
  });

  it('shows error status indicator when upload fails', async () => {
    const user = userEvent.setup();
    mockUploadMutationObj.mutateAsync.mockRejectedValue(new Error('Network error'));

    render(<DocumentUpload />, { wrapper: createWrapper() });

    const file = new File(['test content'], 'test-file.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);
    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // Edge case tests
  describe('edge cases', () => {
    it('shows error for file exceeding 10MB limit', async () => {
      render(<DocumentUpload />, { wrapper: createWrapper() });

      // Create a file that exceeds 10MB (simulated via size property)
      const largeFile = new File(['x'], 'large-file.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [largeFile],
          writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByText(/File size exceeds/)).toBeInTheDocument();
      });
    });

    it('accepts file exactly at 10MB boundary', async () => {
      const user = userEvent.setup();
      render(<DocumentUpload />, { wrapper: createWrapper() });

      // Create a file exactly at the 10MB limit
      const exactLimitFile = new File(['x'], 'exact-limit.pdf', { type: 'application/pdf' });
      Object.defineProperty(exactLimitFile, 'size', { value: 10 * 1024 * 1024 }); // Exactly 10MB

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [exactLimitFile],
          writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected: exact-limit.pdf/)).toBeInTheDocument();
        expect(screen.queryByText(/File size exceeds/)).not.toBeInTheDocument();
      });
    });

    it('handles file with unicode characters in name', async () => {
      const user = userEvent.setup();
      render(<DocumentUpload />, { wrapper: createWrapper() });

      const unicodeFile = new File(['content'], '文档_émoji🎉.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, unicodeFile);

      await waitFor(() => {
        expect(screen.getByText(/Selected: 文档_émoji🎉.pdf/)).toBeInTheDocument();
      });
    });

    it('handles file with special characters in name', async () => {
      const user = userEvent.setup();
      render(<DocumentUpload />, { wrapper: createWrapper() });

      const specialFile = new File(['content'], 'file-with_special (1) [copy].pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, specialFile);

      await waitFor(() => {
        expect(screen.getByText(/Selected: file-with_special \(1\) \[copy\].pdf/)).toBeInTheDocument();
      });
    });

    it('clears previous error when selecting a valid file after invalid file', async () => {
      render(<DocumentUpload />, { wrapper: createWrapper() });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // First, select an invalid file
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [invalidFile],
          configurable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByText(/File type .* is not allowed/)).toBeInTheDocument();
      });

      // Then select a valid file
      const validFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' });
      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [validFile],
          configurable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.queryByText(/File type .* is not allowed/)).not.toBeInTheDocument();
        expect(screen.getByText(/Selected: valid.pdf/)).toBeInTheDocument();
      });
    });

    it('displays documents with various status types', () => {
      const documentsWithStatuses = [
        { id: 1, filename: 'uploading.pdf', fileSize: 1024, mimeType: 'application/pdf', uploadedAt: new Date(), status: 'uploading' },
        { id: 2, filename: 'uploaded.pdf', fileSize: 2048, mimeType: 'application/pdf', uploadedAt: new Date(), status: 'uploaded' },
        { id: 3, filename: 'error.pdf', fileSize: 512, mimeType: 'application/pdf', uploadedAt: new Date(), status: 'error' },
      ];

      mockStubs.documentsListUseQuery.returns({
        ...mockListQuery,
        data: documentsWithStatuses,
      });

      render(<DocumentUpload />, { wrapper: createWrapper() });

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByText('Upload successful!')).toBeInTheDocument();
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });

    it('formats file sizes correctly for various magnitudes', () => {
      const documentsWithSizes = [
        { id: 1, filename: 'tiny.txt', fileSize: 100, mimeType: 'text/plain', uploadedAt: new Date(), status: 'uploaded' }, // 100 bytes
        { id: 2, filename: 'small.pdf', fileSize: 1024 * 50, mimeType: 'application/pdf', uploadedAt: new Date(), status: 'uploaded' }, // 50 KB
        { id: 3, filename: 'medium.pdf', fileSize: 1024 * 1024 * 2.5, mimeType: 'application/pdf', uploadedAt: new Date(), status: 'uploaded' }, // 2.5 MB
      ];

      mockStubs.documentsListUseQuery.returns({
        ...mockListQuery,
        data: documentsWithSizes,
      });

      render(<DocumentUpload />, { wrapper: createWrapper() });

      // Check that sizes are formatted appropriately
      expect(screen.getByText(/100.*B/i)).toBeInTheDocument();
      expect(screen.getByText(/50\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/2\.5 MB/)).toBeInTheDocument();
    });

    it('handles empty file selection (user cancels file dialog)', async () => {
      render(<DocumentUpload />, { wrapper: createWrapper() });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate user opening file dialog and cancelling (empty files array)
      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [],
          configurable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Should not show any selection or error
      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    });

    it('handles all allowed MIME types', async () => {
      const user = userEvent.setup();
      render(<DocumentUpload />, { wrapper: createWrapper() });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const allowedTypes = [
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'image.png', type: 'image/png' },
        { name: 'image.gif', type: 'image/gif' },
        { name: 'notes.txt', type: 'text/plain' },
      ];

      for (const { name, type } of allowedTypes) {
        const file = new File(['content'], name, { type });
        await user.upload(fileInput, file);

        await waitFor(() => {
          expect(screen.getByText(new RegExp(`Selected: ${name}`))).toBeInTheDocument();
        });
      }
    });

    it('keeps upload button disabled during pending mutation even with file selected', async () => {
      const user = userEvent.setup();

      mockStubs.documentsUploadUseMutation.returns({
        ...mockUploadMutationObj,
        isPending: true,
      });

      render(<DocumentUpload />, { wrapper: createWrapper() });

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /Upload/i });
        expect(uploadButton).toBeDisabled();
      });
    });

    it('handles rapid file selection changes', async () => {
      render(<DocumentUpload />, { wrapper: createWrapper() });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Rapidly change file selection
      const files = [
        new File(['a'], 'first.pdf', { type: 'application/pdf' }),
        new File(['b'], 'second.pdf', { type: 'application/pdf' }),
        new File(['c'], 'third.pdf', { type: 'application/pdf' }),
      ];

      for (const file of files) {
        await act(async () => {
          Object.defineProperty(fileInput, 'files', {
            value: [file],
            configurable: true,
          });
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      // Should show the last selected file
      await waitFor(() => {
        expect(screen.getByText(/Selected: third.pdf/)).toBeInTheDocument();
      });
    });
  });
});
