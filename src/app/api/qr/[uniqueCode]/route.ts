import { NextRequest, NextResponse } from "next/server";
import { getQrByCode, deactivateQr } from "@/services/qrService";
import { errorResponse } from "@/lib/errors";

interface Params {
  params: { uniqueCode: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const record = await getQrByCode(params.uniqueCode);
    return NextResponse.json(record, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Soft delete: sets isActive to false, per spec 3.5. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const record = await deactivateQr(params.uniqueCode);
    return NextResponse.json(record, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}
