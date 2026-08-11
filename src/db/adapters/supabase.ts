import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { QRDatabaseAdapter } from "../adapter";
import type {
  ListQROptions,
  ListQRResult,
  QRRecord,
  ScanLogEntry,
} from "@/types/qr";

/*
SQL to create the matching table in Supabase (also see /supabase/schema.sql):

create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  unique_code varchar(12) unique not null,
  original_url text not null,
  tracking_url text not null,
  label text,
  dot_shape text not null,
  eye_outer_shape text not null,
  eye_inner_shape text not null,
  fg_color text not null,
  bg_color text not null,
  overall_shape text not null,
  corner_radius integer,
  error_correction text not null,
  logo_url text,
  size_pixels integer not null,
  image_storage_path text not null,
  svg_storage_path text,
  scan_count integer not null default 0,
  scan_logs jsonb not null default '[]',
  created_by text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_qr_unique_code on qr_codes(unique_code);
*/

function toQRRecord(row: any): QRRecord {
  return {
    id: row.id,
    uniqueCode: row.unique_code,
    originalUrl: row.original_url,
    trackingUrl: row.tracking_url,
    label: row.label ?? null,
    dotShape: row.dot_shape,
    eyeOuterShape: row.eye_outer_shape,
    eyeInnerShape: row.eye_inner_shape,
    fgColor: row.fg_color,
    bgColor: row.bg_color,
    overallShape: row.overall_shape,
    cornerRadius: row.corner_radius ?? null,
    errorCorrection: row.error_correction,
    logoUrl: row.logo_url ?? null,
    sizePixels: row.size_pixels,
    imageStoragePath: row.image_storage_path,
    svgStoragePath: row.svg_storage_path ?? null,
    scanCount: row.scan_count,
    scanLogs: row.scan_logs ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? null,
    isActive: row.is_active,
  };
}

function toRow(record: Omit<QRRecord, "id" | "createdAt" | "updatedAt">) {
  return {
    unique_code: record.uniqueCode,
    original_url: record.originalUrl,
    tracking_url: record.trackingUrl,
    label: record.label,
    dot_shape: record.dotShape,
    eye_outer_shape: record.eyeOuterShape,
    eye_inner_shape: record.eyeInnerShape,
    fg_color: record.fgColor,
    bg_color: record.bgColor,
    overall_shape: record.overallShape,
    corner_radius: record.cornerRadius,
    error_correction: record.errorCorrection,
    logo_url: record.logoUrl,
    size_pixels: record.sizePixels,
    image_storage_path: record.imageStoragePath,
    svg_storage_path: record.svgStoragePath,
    scan_count: record.scanCount,
    scan_logs: record.scanLogs,
    created_by: record.createdBy,
    is_active: record.isActive,
  };
}

export class SupabaseAdapter implements QRDatabaseAdapter {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL / SUPABASE_ANON_KEY are not set in the environment",
      );
    }
    this.client = createClient(url, key);
  }

  async createQR(
    record: Omit<QRRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<QRRecord> {
    const { data, error } = await this.client
      .from("qr_codes")
      .insert(toRow(record))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toQRRecord(data);
  }

  async getQRByCode(uniqueCode: string): Promise<QRRecord | null> {
    const { data, error } = await this.client
      .from("qr_codes")
      .select("*")
      .eq("unique_code", uniqueCode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toQRRecord(data) : null;
  }

  async incrementScan(
    uniqueCode: string,
    entry: ScanLogEntry,
  ): Promise<QRRecord | null> {
    const existing = await this.getQRByCode(uniqueCode);
    if (!existing) return null;

    const { data, error } = await this.client
      .from("qr_codes")
      .update({
        scan_count: existing.scanCount + 1,
        scan_logs: [...existing.scanLogs, entry],
        updated_at: new Date().toISOString(),
      })
      .eq("unique_code", uniqueCode)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toQRRecord(data);
  }

  async listQRs(options: ListQROptions): Promise<ListQRResult> {
    let query = this.client.from("qr_codes").select("*", { count: "exact" });

    if (options.label) query = query.ilike("label", `%${options.label}%`);
    if (options.isActive !== undefined)
      query = query.eq("is_active", options.isActive);
    if (options.dateFrom) query = query.gte("created_at", options.dateFrom);
    if (options.dateTo) query = query.lte("created_at", options.dateTo);

    const from = (options.page - 1) * options.limit;
    const to = from + options.limit - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return {
      data: (data ?? []).map(toQRRecord),
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit) || 1,
    };
  }

  async deactivateQR(uniqueCode: string): Promise<QRRecord | null> {
    const { data, error } = await this.client
      .from("qr_codes")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("unique_code", uniqueCode)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toQRRecord(data) : null;
  }

  async activateQR(uniqueCode: string): Promise<QRRecord | null> {
    const { data, error } = await this.client
      .from("qr_codes")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("unique_code", uniqueCode)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toQRRecord(data) : null;
  }

  async existsByCode(uniqueCode: string): Promise<boolean> {
    const { count, error } = await this.client
      .from("qr_codes")
      .select("*", { count: "exact", head: true })
      .eq("unique_code", uniqueCode);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }
}
