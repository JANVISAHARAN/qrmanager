import {
  getMongooseConnection,
  QRModel,
  type QRDocument,
} from "../mongoose-client";
import type { QRDatabaseAdapter } from "../adapter";
import type {
  ListQROptions,
  ListQRResult,
  QRRecord,
  ScanLogEntry,
} from "@/types/qr";

function toQRRecord(doc: QRDocument): QRRecord {
  return {
    id: doc._id.toString(),
    uniqueCode: doc.uniqueCode,
    originalUrl: doc.originalUrl,
    trackingUrl: doc.trackingUrl,
    label: doc.label ?? null,
    dotShape: doc.dotShape as QRRecord["dotShape"],
    eyeOuterShape: doc.eyeOuterShape as QRRecord["eyeOuterShape"],
    eyeInnerShape: doc.eyeInnerShape as QRRecord["eyeInnerShape"],
    fgColor: doc.fgColor,
    bgColor: doc.bgColor,
    overallShape: doc.overallShape as QRRecord["overallShape"],
    cornerRadius: doc.cornerRadius ?? null,
    errorCorrection: doc.errorCorrection as QRRecord["errorCorrection"],
    logoUrl: doc.logoUrl ?? null,
    sizePixels: doc.sizePixels,
    imageStoragePath: doc.imageStoragePath,
    svgStoragePath: doc.svgStoragePath ?? null,
    scanCount: doc.scanCount,
    scanLogs: (doc.scanLogs ?? []).map((l) => ({
      scannedAt: new Date(l.scannedAt).toISOString(),
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
    })),
    createdAt: new Date((doc as any).createdAt).toISOString(),
    updatedAt: new Date((doc as any).updatedAt).toISOString(),
    createdBy: doc.createdBy ?? null,
    isActive: doc.isActive,
  };
}

export class MongoDBAdapter implements QRDatabaseAdapter {
  private async ready() {
    await getMongooseConnection();
  }

  async createQR(
    record: Omit<QRRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<QRRecord> {
    await this.ready();
    const doc = await QRModel.create(record);
    return toQRRecord(doc);
  }

  async getQRByCode(uniqueCode: string): Promise<QRRecord | null> {
    await this.ready();
    const doc = await QRModel.findOne({ uniqueCode });
    return doc ? toQRRecord(doc) : null;
  }

  async incrementScan(
    uniqueCode: string,
    entry: ScanLogEntry,
  ): Promise<QRRecord | null> {
    await this.ready();
    const doc = await QRModel.findOneAndUpdate(
      { uniqueCode },
      { $inc: { scanCount: 1 }, $push: { scanLogs: entry } },
      { new: true },
    );
    return doc ? toQRRecord(doc) : null;
  }

  async listQRs(options: ListQROptions): Promise<ListQRResult> {
    await this.ready();
    const filter: Record<string, unknown> = {};
    if (options.label) filter.label = { $regex: options.label, $options: "i" };
    if (options.isActive !== undefined) filter.isActive = options.isActive;
    if (options.dateFrom || options.dateTo) {
      filter.createdAt = {
        ...(options.dateFrom ? { $gte: new Date(options.dateFrom) } : {}),
        ...(options.dateTo ? { $lte: new Date(options.dateTo) } : {}),
      };
    }

    const skip = (options.page - 1) * options.limit;
    const [docs, total] = await Promise.all([
      QRModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit),
      QRModel.countDocuments(filter),
    ]);

    return {
      data: docs.map(toQRRecord),
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit) || 1,
    };
  }

  async deactivateQR(uniqueCode: string): Promise<QRRecord | null> {
    await this.ready();
    const doc = await QRModel.findOneAndUpdate(
      { uniqueCode },
      { isActive: false },
      { new: true },
    );
    return doc ? toQRRecord(doc) : null;
  }

  async activateQR(uniqueCode: string): Promise<QRRecord | null> {
    await this.ready();
    const doc = await QRModel.findOneAndUpdate(
      { uniqueCode },
      { isActive: true },
      { new: true },
    );
    return doc ? toQRRecord(doc) : null;
  }

  async existsByCode(uniqueCode: string): Promise<boolean> {
    await this.ready();
    const count = await QRModel.countDocuments({ uniqueCode });
    return count > 0;
  }
}
