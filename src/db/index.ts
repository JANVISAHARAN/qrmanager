import type { QRDatabaseAdapter } from './adapter';
import { MongoDBAdapter } from './adapters/mongodb';
import { SupabaseAdapter } from './adapters/supabase';

let cachedAdapter: QRDatabaseAdapter | null = null;

/**
 * Returns the active DB adapter based on DB_PROVIDER env var.
 * This single function is the entire "switch" - services import
 * getAdapter() and never know or care which DB is behind it.
 */
export function getAdapter(): QRDatabaseAdapter {
  if (cachedAdapter) return cachedAdapter;

  const provider = (process.env.DB_PROVIDER ?? 'mongodb').toLowerCase();

  if (provider === 'supabase') {
    cachedAdapter = new SupabaseAdapter();
  } else if (provider === 'mongodb') {
    cachedAdapter = new MongoDBAdapter();
  } else {
    throw new Error(`Unknown DB_PROVIDER "${provider}". Use "mongodb" or "supabase".`);
  }

  return cachedAdapter;
}
