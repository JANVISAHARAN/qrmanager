import { z } from 'zod';

const hexColor = /^#[0-9A-Fa-f]{6}$/;

export const createQRSchema = z.object({
  originalUrl: z
    .string()
    .min(1, 'originalUrl is required')
    .max(2048, 'originalUrl must not exceed 2048 characters')
    .refine((val) => {
      try {
        // eslint-disable-next-line no-new
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, 'originalUrl must be a valid URL'),
  label: z.string().max(200).optional(),
  dotShape: z
    .enum(['square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'])
    .optional(),
  eyeOuterShape: z.enum(['square', 'rounded']).optional(),
  eyeInnerShape: z.enum(['square', 'dot', 'rounded']).optional(),
  fgColor: z.string().regex(hexColor, 'fgColor must match #RRGGBB').optional(),
  bgColor: z
    .union([z.string().regex(hexColor, 'bgColor must match #RRGGBB'), z.literal('transparent')])
    .optional(),
  gradient: z
    .object({
      type: z.enum(['linear', 'radial']),
      startColor: z.string().regex(hexColor),
      endColor: z.string().regex(hexColor),
    })
    .optional(),
  overallShape: z.enum(['square', 'circle', 'rounded-rectangle']).optional(),
  cornerRadius: z.number().min(0).max(500).optional(),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).optional(),
  logoUrl: z.string().url().optional(),
  sizePixels: z.number().min(200).max(2000).optional(),
  createdBy: z.string().optional(),
});

export const listQRQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  label: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const printLayoutSchema = z.object({
  paperSize: z.enum(['A4', 'A5', 'Letter', 'Custom']),
  customWidth: z.number().positive().optional(),
  customHeight: z.number().positive().optional(),
  columns: z.number().int().min(1).max(10),
  rows: z.number().int().min(1).max(10),
  qrCodes: z.array(z.string().length(12)).min(1, 'At least one uniqueCode is required'),
  showLabel: z.boolean().default(false),
  showUniqueCode: z.boolean().default(false),
  margin: z.number().min(0).max(200).default(20),
  padding: z.number().min(0).max(100).default(10),
});

/** Turns a ZodError into the field-level error map required by section 4.2. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join('.') || '(root)'] = issue.message;
  }
  return out;
}
