import { describe, it, expect } from "vitest";
import {
  createQRSchema,
  printLayoutSchema,
  listQRQuerySchema,
  zodFieldErrors,
} from "@/lib/validation";

describe("createQRSchema", () => {
  it("accepts a minimal valid input", () => {
    const result = createQRSchema.safeParse({
      originalUrl: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-URL originalUrl", () => {
    const result = createQRSchema.safeParse({ originalUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects originalUrl longer than 2048 characters (spec 3.1.1)", () => {
    const longUrl = "https://example.com/" + "a".repeat(2040);
    const result = createQRSchema.safeParse({ originalUrl: longUrl });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid hex color", () => {
    const result = createQRSchema.safeParse({
      originalUrl: "https://example.com",
      fgColor: "not-a-hex-color",
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid hex color and "transparent" background', () => {
    const result = createQRSchema.safeParse({
      originalUrl: "https://example.com",
      fgColor: "#FF00AA",
      bgColor: "transparent",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid dotShape enum value", () => {
    const result = createQRSchema.safeParse({
      originalUrl: "https://example.com",
      dotShape: "triangle", // not a supported shape
    });
    expect(result.success).toBe(false);
  });

  it("rejects sizePixels outside the 200-2000 range (spec 3.1.7)", () => {
    const tooSmall = createQRSchema.safeParse({
      originalUrl: "https://example.com",
      sizePixels: 100,
    });
    const tooLarge = createQRSchema.safeParse({
      originalUrl: "https://example.com",
      sizePixels: 5000,
    });
    expect(tooSmall.success).toBe(false);
    expect(tooLarge.success).toBe(false);
  });
});

describe("printLayoutSchema", () => {
  it("requires at least one uniqueCode", () => {
    const result = printLayoutSchema.safeParse({
      paperSize: "A4",
      columns: 3,
      rows: 4,
      qrCodes: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid A4 layout request", () => {
    const result = printLayoutSchema.safeParse({
      paperSize: "A4",
      columns: 3,
      rows: 4,
      qrCodes: ["A3K9PL2WXZ01"],
    });
    expect(result.success).toBe(true);
  });
});

describe("listQRQuerySchema", () => {
  it("applies default page/limit when not provided", () => {
    const result = listQRQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces isActive query string to a real boolean", () => {
    const result = listQRQuerySchema.parse({ isActive: "true" });
    expect(result.isActive).toBe(true);
  });
});

describe("zodFieldErrors", () => {
  it("converts a ZodError into a flat field->message map", () => {
    const result = createQRSchema.safeParse({ originalUrl: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = zodFieldErrors(result.error);
      expect(fieldErrors).toHaveProperty("originalUrl");
    }
  });
});
