import sharp from "sharp";
import type { OverallShape } from "@/types/qr";

/**
 * Applies the outer clipping mask requested in spec 3.1.5.
 *
 * How it works: the QR is always rendered as a plain square first
 * (qrGenerator.ts). To clip it, we build an SVG mask of the target shape
 * at the same dimensions, then use sharp's `dest-in` composite blend mode,
 * which keeps only the pixels of the QR image that fall inside the mask's
 * opaque region and makes everything else transparent.
 */
export async function applyOverallShape(
  pngBuffer: Buffer,
  shape: OverallShape,
  sizePixels: number,
  cornerRadius?: number | null,
): Promise<Buffer> {
  if (shape === "square") {
    return pngBuffer;
  }

  let maskSvg: string;
  if (shape === "circle") {
    const r = sizePixels / 2;
    maskSvg = `<svg width="${sizePixels}" height="${sizePixels}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`;
  } else {
    const radius = cornerRadius ?? Math.round(sizePixels * 0.08);
    maskSvg = `<svg width="${sizePixels}" height="${sizePixels}"><rect x="0" y="0" width="${sizePixels}" height="${sizePixels}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`;
  }

  const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer();

  return sharp(pngBuffer)
    .resize(sizePixels, sizePixels)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/**
 * Prepares a user-uploaded logo for embedding: resizes it to a square,
 * and adds a solid-color padded border so the logo doesn't touch the QR
 * dots directly (spec 3.1.6).
 */
export async function prepareLogo(
  logoInput: Buffer,
  targetSizePixels: number,
  paddingColor = "#FFFFFF",
): Promise<Buffer> {
  const innerSize = Math.round(targetSizePixels * 0.8);
  const paddingPx = Math.round(targetSizePixels * 0.1);

  const resizedLogo = await sharp(logoInput)
    .resize(innerSize, innerSize, { fit: "contain", background: paddingColor })
    .toBuffer();

  return sharp({
    create: {
      width: targetSizePixels,
      height: targetSizePixels,
      channels: 4,
      background: paddingColor,
    },
  })
    .composite([{ input: resizedLogo, top: paddingPx, left: paddingPx }])
    .png()
    .toBuffer();
}

/** Writes a PNG buffer to disk under /public/qr-images and returns the
 * public path to store in imageStoragePath (spec 3.2.2 + FAQ Q4). */
export async function saveQrImage(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const storageDir =
    process.env.QR_IMAGE_STORAGE_PATH ??
    path.join(process.cwd(), "public", "qr-images");

  await fs.mkdir(storageDir, { recursive: true });
  const fullPath = path.join(storageDir, filename);
  await fs.writeFile(fullPath, buffer);

  return `/qr-images/${filename}`;
}

/** Writes the bonus SVG export alongside the mandatory PNG. */
export async function saveSvgFile(
  svg: string,
  filename: string,
): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const storageDir =
    process.env.QR_IMAGE_STORAGE_PATH ??
    path.join(process.cwd(), "public", "qr-images");

  await fs.mkdir(storageDir, { recursive: true });
  const fullPath = path.join(storageDir, filename);
  await fs.writeFile(fullPath, svg, "utf-8");

  return `/qr-images/${filename}`;
}
