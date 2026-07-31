import { NextResponse } from 'next/server';
import type { ApiErrorShape } from '@/types/qr';

/**
 * Thrown anywhere in the service/lib layer. API routes catch this and
 * convert it into the structured JSON error shape required by the spec
 * (section 4.1) - never a raw stack trace.
 */
export class ApiError extends Error {
  code: string;
  statusCode: number;
  fieldErrors?: Record<string, string>;

  constructor(code: string, message: string, statusCode: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

export function errorResponse(err: unknown): NextResponse<ApiErrorShape> {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: true,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
      },
      { status: err.statusCode }
    );
  }

  // Unknown/unexpected error - log full detail server-side, but never leak
  // the stack trace or internals to the client.
  console.error('Unhandled error:', err);
  return NextResponse.json(
    {
      error: true,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      statusCode: 500,
    },
    { status: 500 }
  );
}
