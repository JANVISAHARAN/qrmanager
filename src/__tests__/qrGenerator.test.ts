import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { renderQr } from "@/lib/qrGenerator";

const baseOptions = {
  data: "https://example.com/verify/A3K9PL2WXZ01",
  sizePixels: 300,
  dotShape: "square" as const,
  eyeOuterShape: "square" as const,
  eyeInnerShape: "square" as const,
  fgColor: "#000000",
  bgColor: "#FFFFFF",
  errorCorrection: "M" as const,
  overallShape: "square" as const,
};

describe("renderQr", () => {
  it("produces a PNG buffer matching the requested sizePixels", async () => {
    const { png } = await renderQr(baseOptions);
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(300);
    expect(metadata.height).toBe(300);
  });

  it("produces valid SVG markup alongside the PNG (bonus export)", async () => {
    const { svg } = await renderQr(baseOptions);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('viewBox="0 0 300 300"');
  });

  it("renders every dot shape option without throwing (spec 3.1.2)", async () => {
    const shapes = [
      "square",
      "rounded",
      "dots",
      "classy",
      "classy-rounded",
      "extra-rounded",
    ] as const;
    for (const dotShape of shapes) {
      const { png } = await renderQr({ ...baseOptions, dotShape });
      const metadata = await sharp(png).metadata();
      expect(metadata.width).toBe(300);
    }
  });

  it('clips to a circle when overallShape is "circle" (spec 3.1.5)', async () => {
    const { png } = await renderQr({ ...baseOptions, overallShape: "circle" });
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Sample the very top-left corner pixel - outside a circle inscribed
    // in a square, it must be fully transparent (alpha === 0).
    const cornerAlpha = data[3]; // first pixel's alpha channel
    expect(cornerAlpha).toBe(0);
    expect(info.channels).toBe(4);
  });

  it("applies a gradient fill when requested (bonus)", async () => {
    const { svg } = await renderQr({
      ...baseOptions,
      gradient: { type: "linear", startColor: "#FF0000", endColor: "#0000FF" },
    });
    expect(svg).toContain("linearGradient");
    expect(svg).toContain("#FF0000");
    expect(svg).toContain("#0000FF");
  });

  it("respects a transparent background", async () => {
    const { svg } = await renderQr({ ...baseOptions, bgColor: "transparent" });
    expect(svg).not.toMatch(
      /<rect x="0" y="0" width="300" height="300" fill="#FFFFFF"/,
    );
  });
});
