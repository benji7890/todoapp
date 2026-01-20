import { PDFParse } from 'pdf-parse';

/**
 * Extract text from a PDF file buffer
 * @param fileBuffer - PDF file buffer
 * @returns Extracted plain text content
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
