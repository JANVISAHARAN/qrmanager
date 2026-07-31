// Central type definitions for the QR Code Management System.
// Kept in one file so both DB adapters (Mongo + Supabase) and the API
// routes agree on exactly the same shape.

export type DotShape =
  | 'square'
  | 'rounded'
  | 'dots'
  | 'classy'
  | 'classy-rounded'
  | 'extra-rounded';

export type EyeOuterShape = 'square' | 'rounded';
export type EyeInnerShape = 'square' | 'dot' | 'rounded';
export type OverallShape = 'square' | 'circle' | 'rounded-rectangle';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface ScanLogEntry {
  scannedAt: string; // ISO date string
  ipAddress: string;
  userAgent: string;
}

/**
 * The canonical QR record. Both DB adapters must read/write exactly this
 * shape so the rest of the app (services, API routes) is DB-agnostic.
 */
export interface QRRecord {
  id: string; // Mongo ObjectId (stringified) or Postgres UUID
  uniqueCode: string; // 12-char alphanumeric QUC, unique
  originalUrl: string;
  trackingUrl: string;
  label: string | null;
  dotShape: DotShape;
  eyeOuterShape: EyeOuterShape;
  eyeInnerShape: EyeInnerShape;
  fgColor: string; // hex
  bgColor: string; // hex or 'transparent'
  overallShape: OverallShape;
  cornerRadius: number | null; // used only when overallShape === 'rounded-rectangle'
  errorCorrection: ErrorCorrectionLevel;
  logoUrl: string | null;
  sizePixels: number;
  imageStoragePath: string;
  scanCount: number;
  scanLogs: ScanLogEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  isActive: boolean;
}

/** Fields the client is allowed to supply when creating a QR code. */
export interface CreateQRInput {
  originalUrl: string;
  label?: string;
  dotShape?: DotShape;
  eyeOuterShape?: EyeOuterShape;
  eyeInnerShape?: EyeInnerShape;
  fgColor?: string;
  bgColor?: string;
  gradient?: {
    type: 'linear' | 'radial';
    startColor: string;
    endColor: string;
  };
  overallShape?: OverallShape;
  cornerRadius?: number;
  errorCorrection?: ErrorCorrectionLevel;
  logoUrl?: string;
  sizePixels?: number;
  createdBy?: string;
}

export interface ListQROptions {
  page: number;
  limit: number;
  label?: string;
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface ListQRResult {
  data: QRRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PrintLayoutOptions {
  paperSize: 'A4' | 'A5' | 'Letter' | 'Custom';
  customWidth?: number;
  customHeight?: number;
  columns: number;
  rows: number;
  qrCodes: string[]; // uniqueCodes
  showLabel: boolean;
  showUniqueCode: boolean;
  margin: number;
  padding: number;
}

/** Structured API error shape used everywhere (see NFR 4.1 in the brief). */
export interface ApiErrorShape {
  error: true;
  code: string;
  message: string;
  statusCode: number;
  fieldErrors?: Record<string, string>;
}
