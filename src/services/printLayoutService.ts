import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { getAdapter } from '@/db';
import { ApiError } from '@/lib/errors';
import type { PrintLayoutOptions } from '@/types/qr';

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },
  A5: { width: 559, height: 794 },
  Letter: { width: 816, height: 1056 },
};

function getPageDimensions(options: PrintLayoutOptions) {
  if (options.paperSize === 'Custom') {
    if (!options.customWidth || !options.customHeight) {
      throw new ApiError(
        'INVALID_PAPER_SIZE',
        'customWidth and customHeight are required when paperSize is "Custom".',
        400
      );
    }
    return { width: options.customWidth, height: options.customHeight };
  }
  return PAPER_SIZES[options.paperSize];
}

/**
 * Builds one or more print-ready page images. Spec 3.4.2: cell size is
 * derived from page width, column count, and margins; QR codes are placed
 * left-to-right, top-to-bottom; overflow spills onto additional pages.
 */
export async function generatePrintLayout(options: PrintLayoutOptions): Promise<Buffer[]> {
  const { width: pageWidth, height: pageHeight } = getPageDimensions(options);
  const adapter = getAdapter();

  const records = await Promise.all(
    options.qrCodes.map(async (code) => {
      const record = await adapter.getQRByCode(code);
      if (!record) {
        throw new ApiError('QR_NOT_FOUND', `No QR code found for uniqueCode "${code}".`, 404);
      }
      return record;
    })
  );

  const { columns, rows, margin, padding } = options;
  const perPage = columns * rows;

  const cellWidth = Math.floor((pageWidth - (columns + 1) * margin) / columns);
  const labelReservedHeight = options.showLabel || options.showUniqueCode ? 40 : 0;
  const cellHeight = Math.floor((pageHeight - (rows + 1) * margin) / rows);
  const qrDrawSize = Math.min(cellWidth, cellHeight - labelReservedHeight) - padding * 2;

  const pages: Buffer[] = [];

  for (let pageStart = 0; pageStart < records.length; pageStart += perPage) {
    const pageRecords = records.slice(pageStart, pageStart + perPage);

    const composites: sharp.OverlayOptions[] = [];
    const svgTextLayers: string[] = [];

    for (let i = 0; i < pageRecords.length; i++) {
      const record = pageRecords[i];
      const col = i % columns;
      const row = Math.floor(i / columns);

      const cellX = margin + col * (cellWidth + margin);
      const cellY = margin + row * (cellHeight + margin);
      const qrX = cellX + padding;
      const qrY = cellY + padding;

      const storagePath = record.imageStoragePath.startsWith('/')
        ? path.join(process.cwd(), 'public', record.imageStoragePath)
        : record.imageStoragePath;

      let qrBuffer: Buffer;
      try {
        qrBuffer = await fs.readFile(storagePath);
      } catch {
        throw new ApiError(
          'IMAGE_NOT_FOUND',
          `Stored QR image for "${record.uniqueCode}" could not be read from disk.`,
          500
        );
      }

      const resized = await sharp(qrBuffer)
        .resize(qrDrawSize, qrDrawSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();

      composites.push({ input: resized, top: qrY, left: qrX });

      if (options.showLabel || options.showUniqueCode) {
        const textY = qrY + qrDrawSize + 14;
        const lines: string[] = [];
        if (options.showLabel && record.label) {
          lines.push(escapeXml(record.label));
        }
        if (options.showUniqueCode) {
          lines.push(escapeXml(record.uniqueCode));
        }
        const textSvg = lines
          .map(
            (line, idx) =>
              `<text x="${qrX + qrDrawSize / 2}" y="${textY + idx * 16}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#111111" text-anchor="middle">${line}</text>`
          )
          .join('');
        svgTextLayers.push(textSvg);
      }
    }

    let page = sharp({
      create: {
        width: pageWidth,
        height: pageHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    }).composite(composites);

    if (svgTextLayers.length > 0) {
      const overlaySvg = `<svg width="${pageWidth}" height="${pageHeight}" xmlns="http://www.w3.org/2000/svg">${svgTextLayers.join('')}</svg>`;
      page = sharp(await page.png().toBuffer()).composite([
        { input: Buffer.from(overlaySvg), top: 0, left: 0 },
      ]);
    }

    pages.push(await page.png().toBuffer());
  }

  return pages;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
