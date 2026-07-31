import { NextRequest, NextResponse } from 'next/server';
import { createQr } from '@/services/qrService';
import { createQRSchema, zodFieldErrors } from '@/lib/validation';
import { ApiError, errorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => {
      throw new ApiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    });

    const parsed = createQRSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'One or more fields are invalid.', 400, zodFieldErrors(parsed.error));
    }

    const record = await createQr(parsed.data);

    return NextResponse.json(
      {
        uniqueCode: record.uniqueCode,
        trackingUrl: record.trackingUrl,
        imageUrl: record.imageStoragePath,
        record,
      },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
