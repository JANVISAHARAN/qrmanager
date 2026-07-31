import { NextRequest, NextResponse } from 'next/server';
import { getQrByCode } from '@/services/qrService';
import { errorResponse } from '@/lib/errors';

interface Params {
  params: { uniqueCode: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const record = await getQrByCode(params.uniqueCode);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    const sorted = [...record.scanLogs].sort(
      (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    );
    const start = (page - 1) * limit;
    const pageLogs = sorted.slice(start, start + limit);

    return NextResponse.json(
      {
        uniqueCode: record.uniqueCode,
        total: sorted.length,
        page,
        limit,
        totalPages: Math.ceil(sorted.length / limit) || 1,
        scanLogs: pageLogs,
      },
      { status: 200 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
