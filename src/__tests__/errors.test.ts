import { describe, it, expect } from "vitest";
import { ApiError, errorResponse } from "@/lib/errors";

describe("ApiError + errorResponse", () => {
  it("produces the exact structured shape required by spec 4.1", async () => {
    const err = new ApiError(
      "QR_NOT_FOUND",
      "No QR code found for the given unique code.",
      404,
    );
    const response = errorResponse(err);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: true,
      code: "QR_NOT_FOUND",
      message: "No QR code found for the given unique code.",
      statusCode: 404,
    });
  });

  it("includes fieldErrors when provided (validation failures)", async () => {
    const err = new ApiError("VALIDATION_ERROR", "Invalid input.", 400, {
      originalUrl: "originalUrl is required",
    });
    const response = errorResponse(err);
    const body = await response.json();

    expect(body.fieldErrors).toEqual({
      originalUrl: "originalUrl is required",
    });
  });

  it("never leaks raw error details for unexpected errors - returns a generic 500", async () => {
    const unexpected = new Error(
      "some internal database connection string leaked here",
    );
    const response = errorResponse(unexpected);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
    // The raw message must NOT be echoed back to the client.
    expect(JSON.stringify(body)).not.toContain("database connection string");
  });
});
