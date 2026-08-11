import { NextRequest, NextResponse } from "next/server";
import { generatePrintLayout } from "@/services/printLayoutService";
import { pngPagesToPdf } from "@/lib/pdfCombine";
import { printLayoutSchema, zodFieldErrors } from "@/lib/validation";
import { ApiError, errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => {
      throw new ApiError(
        "INVALID_JSON",
        "Request body must be valid JSON.",
        400,
      );
    });

    const parsed = printLayoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "One or more fields are invalid.",
        400,
        zodFieldErrors(parsed.error),
      );
    }

    const pages = await generatePrintLayout(parsed.data);

    if (pages.length === 0) {
      throw new ApiError(
        "NO_PAGES_GENERATED",
        "No pages were generated for the given input.",
        500,
      );
    }

    // Multiple pages -> combine into a single downloadable PDF (spec
    // 3.4.2 step 5). A single page can be returned directly as a PNG.
    if (pages.length > 1) {
      const pdfBuffer = await pngPagesToPdf(pages);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="qr-print-layout.pdf"',
        },
      });
    }

    const [onlyPage] = pages;
    if (!onlyPage) {
      throw new ApiError(
        "NO_PAGES_GENERATED",
        "No pages were generated for the given input.",
        500,
      );
    }
    return new NextResponse(new Uint8Array(onlyPage), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="qr-print-layout.png"',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
