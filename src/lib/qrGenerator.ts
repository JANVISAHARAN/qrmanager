// Core QR *image* generation - pure JavaScript, no native compilation
// required (deliberately avoids `canvas`/`jsdom`, which need a full C++
// toolchain to build on Windows and are a common source of setup pain).
//
// Approach: `qrcode` (pure JS) computes the QR module matrix (which
// squares are dark/light, after error-correction + masking). We then
// hand-draw that matrix as an SVG - choosing a shape per module for the
// dot style, and separate custom shapes for the three finder-pattern
// "eyes" - and rasterize the SVG to PNG using `sharp`, which ships
// prebuilt binaries so `npm install` never needs to compile anything.

import QRCode from "qrcode";
import sharp from "sharp";
import type {
  CreateQRInput,
  DotShape,
  EyeInnerShape,
  EyeOuterShape,
} from "@/types/qr";

export interface RenderQrOptions {
  data: string;
  sizePixels: number;
  dotShape: DotShape;
  eyeOuterShape: EyeOuterShape;
  eyeInnerShape: EyeInnerShape;
  fgColor: string;
  bgColor: string; // hex or 'transparent'
  gradient?: CreateQRInput["gradient"];
  errorCorrection: "L" | "M" | "Q" | "H";
  logoBuffer?: Buffer;
}

const MARGIN_MODULES = 4; // quiet zone, per QR spec recommendation

// Per-module corner radius as a fraction of module size. These are a
// reasonable visual approximation of each named style rather than a
// pixel-perfect clone of any particular commercial library - documented
// here and in the README as a known simplification.
const DOT_RADIUS_RATIO: Record<DotShape, number> = {
  square: 0,
  rounded: 0.28,
  dots: 0.5, // drawn as a circle, see renderModule()
  classy: 0.15,
  "classy-rounded": 0.4,
  "extra-rounded": 0.48,
};

function isInFinderZone(row: number, col: number, size: number): boolean {
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= size - 7;
  const inBottomLeft = row >= size - 7 && col < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

function renderModule(
  x: number,
  y: number,
  m: number,
  shape: DotShape,
  fill: string,
): string {
  if (shape === "dots") {
    const r = (m / 2) * 0.85;
    return `<circle cx="${x + m / 2}" cy="${y + m / 2}" r="${r}" fill="${fill}"/>`;
  }
  const rx = m * DOT_RADIUS_RATIO[shape];
  return `<rect x="${x}" y="${y}" width="${m}" height="${m}" rx="${rx}" ry="${rx}" fill="${fill}"/>`;
}

/** Draws one finder-pattern "eye": a 7x7 outer ring + 3x3 inner dot. */
function renderEye(
  originX: number,
  originY: number,
  m: number,
  outerShape: EyeOuterShape,
  innerShape: EyeInnerShape,
  fill: string,
): string {
  const outerSize = 7 * m;
  const outerRx = outerShape === "rounded" ? m * 1.8 : 0;
  const innerRingOffset = m;
  const innerHoleSize = 5 * m;
  const innerHoleRx = outerShape === "rounded" ? m * 1.2 : 0;

  const ringPath = `<path fill-rule="evenodd" fill="${fill}" d="
    M${originX},${originY} h${outerSize} v${outerSize} h-${outerSize} Z
    M${originX + innerRingOffset},${originY + innerRingOffset} h${innerHoleSize} v${innerHoleSize} h-${innerHoleSize} Z
  "/>`;
  const roundedRing =
    outerShape === "rounded"
      ? `<rect x="${originX}" y="${originY}" width="${outerSize}" height="${outerSize}" rx="${outerRx}" ry="${outerRx}" fill="${fill}"/>
         <rect x="${originX + innerRingOffset}" y="${originY + innerRingOffset}" width="${innerHoleSize}" height="${innerHoleSize}" rx="${innerHoleRx}" ry="${innerHoleRx}" fill="white"/>`
      : ringPath;

  const innerOrigin = originX + 2 * m;
  const innerOriginY = originY + 2 * m;
  const innerSize = 3 * m;
  let innerShapeSvg: string;
  if (innerShape === "dot") {
    const r = innerSize / 2;
    innerShapeSvg = `<circle cx="${innerOrigin + r}" cy="${innerOriginY + r}" r="${r}" fill="${fill}"/>`;
  } else {
    const rx = innerShape === "rounded" ? innerSize * 0.3 : 0;
    innerShapeSvg = `<rect x="${innerOrigin}" y="${innerOriginY}" width="${innerSize}" height="${innerSize}" rx="${rx}" ry="${rx}" fill="${fill}"/>`;
  }

  return roundedRing + innerShapeSvg;
}

export async function renderQrPng(options: RenderQrOptions): Promise<Buffer> {
  const qr = QRCode.create(options.data, {
    errorCorrectionLevel: options.errorCorrection,
  });

  const matrixSize = qr.modules.size;
  const moduleData = qr.modules.data;
  const totalModules = matrixSize + MARGIN_MODULES * 2;
  const m = options.sizePixels / totalModules;
  const offset = MARGIN_MODULES * m;

  const fillRef = options.gradient ? "url(#qrGradient)" : options.fgColor;

  const gradientDef = options.gradient
    ? options.gradient.type === "linear"
      ? `<linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stop-color="${options.gradient.startColor}"/>
           <stop offset="100%" stop-color="${options.gradient.endColor}"/>
         </linearGradient>`
      : `<radialGradient id="qrGradient" cx="50%" cy="50%" r="70%">
           <stop offset="0%" stop-color="${options.gradient.startColor}"/>
           <stop offset="100%" stop-color="${options.gradient.endColor}"/>
         </radialGradient>`
    : "";

  const backgroundRect =
    options.bgColor === "transparent"
      ? ""
      : `<rect x="0" y="0" width="${options.sizePixels}" height="${options.sizePixels}" fill="${options.bgColor}"/>`;

  const moduleShapes: string[] = [];
  for (let row = 0; row < matrixSize; row++) {
    for (let col = 0; col < matrixSize; col++) {
      if (isInFinderZone(row, col, matrixSize)) continue;
      const dark = moduleData[row * matrixSize + col] === 1;
      if (!dark) continue;
      const x = offset + col * m;
      const y = offset + row * m;
      moduleShapes.push(renderModule(x, y, m, options.dotShape, fillRef));
    }
  }

  const eyePositions: Array<[number, number]> = [
    [0, 0],
    [0, matrixSize - 7],
    [matrixSize - 7, 0],
  ];
  const eyeShapes = eyePositions.map(([row, col]) =>
    renderEye(
      offset + col * m,
      offset + row * m,
      m,
      options.eyeOuterShape,
      options.eyeInnerShape,
      fillRef,
    ),
  );

  const svg = `<svg width="${options.sizePixels}" height="${options.sizePixels}" viewBox="0 0 ${options.sizePixels} ${options.sizePixels}" xmlns="http://www.w3.org/2000/svg">
    <defs>${gradientDef}</defs>
    ${backgroundRect}
    ${moduleShapes.join("")}
    ${eyeShapes.join("")}
  </svg>`;

  let png = await sharp(Buffer.from(svg)).png().toBuffer();

  if (options.logoBuffer) {
    const logoTargetSize = Math.round(options.sizePixels * 0.22);
    const resizedLogo = await sharp(options.logoBuffer)
      .resize(logoTargetSize, logoTargetSize, {
        fit: "contain",
        background: "#FFFFFF",
      })
      .png()
      .toBuffer();
    const left = Math.round((options.sizePixels - logoTargetSize) / 2);
    png = await sharp(png)
      .composite([{ input: resizedLogo, top: left, left }])
      .png()
      .toBuffer();
  }

  return png;
}
