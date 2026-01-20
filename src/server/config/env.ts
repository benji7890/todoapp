import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

// Validate required environment variables
if (!OPENROUTER_API_KEY) {
  console.warn('Warning: OPENROUTER_API_KEY is not set in .env file');
}
