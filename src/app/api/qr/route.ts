import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/db';
import { listQRQuerySchema, zodFieldErrors } from '@/lib/validation';
import { ApiError, errorResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = Object.fromEntries(searchParams.entries());

    const parsed = listQRQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid query parameters.', 400, zodFieldErrors(parsed.error));
    }

    const result = await getAdapter().listQRs(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}
