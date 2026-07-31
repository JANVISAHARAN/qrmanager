import { NextRequest, NextResponse } from 'next/server';
import { activateQr } from '@/services/qrService';
import { errorResponse } from '@/lib/errors';

interface Params {
  params: { uniqueCode: string };
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const record = await activateQr(params.uniqueCode);
    return NextResponse.json(record, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}
