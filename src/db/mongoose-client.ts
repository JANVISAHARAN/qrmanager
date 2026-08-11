import mongoose from "mongoose";

// Reuse the connection across hot-reloads / serverless invocations instead
// of opening a new one on every request.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function getMongooseConnection(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your .env file (see .env.example).",
    );
  }

  if (!global._mongooseConn) {
    global._mongooseConn = mongoose.connect(uri);
  }
  return global._mongooseConn;
}

const scanLogSchema = new mongoose.Schema(
  {
    scannedAt: { type: Date, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
  },
  { _id: false },
);

const qrSchema = new mongoose.Schema(
  {
    uniqueCode: { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true },
    trackingUrl: { type: String, required: true },
    label: { type: String, default: null },
    dotShape: {
      type: String,
      enum: [
        "square",
        "rounded",
        "dots",
        "classy",
        "classy-rounded",
        "extra-rounded",
      ],
      required: true,
    },
    eyeOuterShape: {
      type: String,
      enum: ["square", "rounded"],
      required: true,
    },
    eyeInnerShape: {
      type: String,
      enum: ["square", "dot", "rounded"],
      required: true,
    },
    fgColor: { type: String, required: true },
    bgColor: { type: String, required: true },
    overallShape: {
      type: String,
      enum: ["square", "circle", "rounded-rectangle"],
      required: true,
    },
    cornerRadius: { type: Number, default: null },
    errorCorrection: {
      type: String,
      enum: ["L", "M", "Q", "H"],
      required: true,
    },
    logoUrl: { type: String, default: null },
    sizePixels: { type: Number, required: true },
    imageStoragePath: { type: String, required: true },
    svgStoragePath: { type: String, default: null },
    scanCount: { type: Number, default: 0 },
    scanLogs: { type: [scanLogSchema], default: [] },
    createdBy: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type QRDocument = mongoose.InferSchemaType<typeof qrSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Avoid "OverwriteModelError" during Next.js hot reload in dev.
export const QRModel =
  (mongoose.models.QRCode as mongoose.Model<QRDocument>) ||
  mongoose.model<QRDocument>("QRCode", qrSchema);
