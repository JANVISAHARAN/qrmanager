import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';
import { ApiError, errorResponse } from '@/lib/errors';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => {
      throw new ApiError('INVALID_FORM_DATA', 'Request must be multipart/form-data.', 400);
    });

    const file = formData.get('logo');
    if (!file || !(file instanceof File)) {
      throw new ApiError('MISSING_FILE', 'A "logo" file field is required.', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ApiError(
        'UNSUPPORTED_FILE_TYPE',
        `Unsupported file type "${file.type}". Allowed: ${ALLOWED_TYPES.join(', ')}.`,
        400
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new ApiError('FILE_TOO_LARGE', 'Logo file must not exceed 5MB.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1].replace('svg+xml', 'svg');
    const filename = `logo-${nanoid(10)}.${ext}`;

    const storageDir =
      process.env.QR_IMAGE_STORAGE_PATH ?? path.join(process.cwd(), 'public', 'qr-images');
    await fs.mkdir(storageDir, { recursive: true });
    await fs.writeFile(path.join(storageDir, filename), buffer);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const publicPath = `/qr-images/${filename}`;

    return NextResponse.json(
      {
        logoUrl: `${baseUrl.replace(/\/$/, '')}${publicPath}`,
        storedPath: publicPath,
      },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
