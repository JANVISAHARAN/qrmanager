import { customAlphabet } from 'nanoid';
import { ApiError } from './errors';
import type { QRDatabaseAdapter } from '@/db/adapter';

// Uppercase alphanumeric only, 12 characters, per spec section 3.2.1
// (e.g. A3K9PL2WXZ01).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const generateRaw = customAlphabet(ALPHABET, 12);

const MAX_RETRIES = 5;

/**
 * Generates a QUC and guarantees it does not already exist in the DB,
 * retrying up to MAX_RETRIES times on collision (spec 3.2.1). Throws a
 * 500 ApiError if still colliding after all retries.
 */
export async function generateUniqueCode(adapter: QRDatabaseAdapter): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = generateRaw();
    const exists = await adapter.existsByCode(candidate);
    if (!exists) return candidate;
  }

  throw new ApiError(
    'CODE_GENERATION_FAILED',
    `Could not generate a unique code after ${MAX_RETRIES} attempts.`,
    500
  );
}
