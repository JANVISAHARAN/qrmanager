import { PDFDocument } from 'pdf-lib';

/**
 * Combines multiple PNG page buffers into a single multi-page PDF, so a
 * multi-page print job (spec 3.4.2 step 5) downloads as one file instead
 * of a batch of loose images.
 */
export async function pngPagesToPdf(pages: Buffer[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  for (const pngBuffer of pages) {
    const pngImage = await pdfDoc.embedPng(pngBuffer);
    const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pngImage.width,
      height: pngImage.height,
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
