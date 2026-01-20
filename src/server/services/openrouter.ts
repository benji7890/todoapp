import { OPENROUTER_API_KEY } from '../config/env';
import { ExtractedData } from '../../shared/documents';

/**
 * Extract JSON object from response text that may contain surrounding text
 * @param text - Response text that may contain JSON
 * @returns Extracted JSON string
 */
function extractJSON(text: string): string {
  // First, try to remove markdown code blocks if present
  let cleaned = text.trim();

  if (cleaned.includes('```json')) {
    const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }
  } else if (cleaned.includes('```')) {
    const codeMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      cleaned = codeMatch[1].trim();
    }
  }

  // Find the first { and last } to extract JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  throw new Error('No JSON object found in response');
}

/**
 * Extract structured data from PDF text using OpenRouter AI
 * @param text - Plain text extracted from PDF
 * @returns Structured data conforming to ExtractedData interface
 */
export async function extractDataFromText(text: string): Promise<ExtractedData> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const prompt = `You are a document parsing assistant. Extract structured data from the following document text and return it as JSON.

Please extract the following information:
- documentType: The type of document (e.g., "invoice", "receipt", "contract", "letter", "report")
- vendor: The company or person name associated with this document
- amount: The total amount (if applicable, as a number)
- date: The document date in ISO format (YYYY-MM-DD)
- description: A brief description of the document
- lineItems: An array of line items with description and amount (if applicable)

Return ONLY valid JSON matching this schema:
{
  "documentType": string,
  "vendor": string,
  "amount": number | undefined,
  "date": string,
  "description": string,
  "lineItems": [{ "description": string, "amount": number }] | undefined
}

Document text:
${text} Return ONLY the structured data with no additional words, no markdown files`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001', // Optional, for OpenRouter analytics
        'X-Title': 'PDF Document Parser', // Optional, for OpenRouter analytics
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // Using Claude 3.5 Sonnet for high-quality extraction
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    // Log the raw response for debugging
    console.log('OpenRouter response (first 200 chars):', content.substring(0, 200));

    // Extract JSON from the response (handles text before/after JSON)
    const jsonText = extractJSON(content);

    const extractedData: ExtractedData = JSON.parse(jsonText);

    // Validate required fields
    if (!extractedData.documentType || !extractedData.vendor || !extractedData.date || !extractedData.description) {
      throw new Error('Missing required fields in extracted data');
    }

    return extractedData;
  } catch (error) {
    console.error('Error extracting data from text:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to extract data from text: ${error.message}`);
    }
    throw error;
  }
}
