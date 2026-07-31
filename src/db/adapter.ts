import type {
  ListQROptions,
  ListQRResult,
  QRRecord,
  ScanLogEntry,
} from '@/types/qr';

/**
 * Every DB provider (MongoDB, Supabase/Postgres, ...) implements this
 * interface. Services never talk to Mongoose or Supabase directly - they
 * only depend on this contract, so swapping DB_PROVIDER is a one-line
 * env change (see getAdapter() in ./index.ts).
 */
export interface QRDatabaseAdapter {
  /** Insert a fully-formed QR record. Throws on duplicate uniqueCode. */
  createQR(
    record: Omit<QRRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<QRRecord>;

  /** Fetch a single record by its public unique code, or null. */
  getQRByCode(uniqueCode: string): Promise<QRRecord | null>;

  /** Atomically bump scanCount and append a scan log entry. */
  incrementScan(uniqueCode: string, entry: ScanLogEntry): Promise<QRRecord | null>;

  /** Paginated, filterable listing. */
  listQRs(options: ListQROptions): Promise<ListQRResult>;

  /** Soft-delete: set isActive = false. */
  deactivateQR(uniqueCode: string): Promise<QRRecord | null>;

  /** Re-enable a previously deactivated QR. */
  activateQR(uniqueCode: string): Promise<QRRecord | null>;

  /** Used by the unique-code generator to check collisions before insert. */
  existsByCode(uniqueCode: string): Promise<boolean>;
}
