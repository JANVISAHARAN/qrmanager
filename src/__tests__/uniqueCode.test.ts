import { describe, it, expect, vi } from "vitest";
import { generateUniqueCode } from "@/lib/uniqueCode";
import { ApiError } from "@/lib/errors";
import type { QRDatabaseAdapter } from "@/db/adapter";

// Minimal fake adapter - only existsByCode matters for this unit.
function fakeAdapter(existsSequence: boolean[]): QRDatabaseAdapter {
  let call = 0;
  return {
    createQR: vi.fn(),
    getQRByCode: vi.fn(),
    incrementScan: vi.fn(),
    listQRs: vi.fn(),
    deactivateQR: vi.fn(),
    activateQR: vi.fn(),
    existsByCode: vi.fn(async () => existsSequence[call++] ?? false),
  };
}

describe("generateUniqueCode", () => {
  it("returns a 12-character uppercase alphanumeric code on first try when no collision", async () => {
    const adapter = fakeAdapter([false]);
    const code = await generateUniqueCode(adapter);
    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[A-Z0-9]{12}$/);
    expect(adapter.existsByCode).toHaveBeenCalledTimes(1);
  });

  it("retries on collision and succeeds once a unique code is found", async () => {
    // First two attempts collide, third succeeds.
    const adapter = fakeAdapter([true, true, false]);
    const code = await generateUniqueCode(adapter);
    expect(code).toMatch(/^[A-Z0-9]{12}$/);
    expect(adapter.existsByCode).toHaveBeenCalledTimes(3);
  });

  it("throws a 500 ApiError after 5 consecutive collisions", async () => {
    const adapter = fakeAdapter([true, true, true, true, true]);
    await expect(generateUniqueCode(adapter)).rejects.toThrow(ApiError);
    await expect(
      generateUniqueCode(fakeAdapter([true, true, true, true, true])),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: "CODE_GENERATION_FAILED",
    });
    expect(adapter.existsByCode).toHaveBeenCalledTimes(5);
  });
});
