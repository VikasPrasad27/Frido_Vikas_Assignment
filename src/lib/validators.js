import { z } from 'zod';

export const RequestStatusEnum = z.enum([
  'OPEN',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
]);

export const ReturnReasonEnum = z.enum([
  'DAMAGED',
  'WRONG_ITEM',
  'SIZE_ISSUE',
  'NOT_AS_DESCRIBED',
  'CHANGED_MIND',
]);

export const ResolutionTypeEnum = z.enum([
  'REFUND',
  'REPLACEMENT',
  'STORE_CREDIT',
]);

export const createRequestSchema = z.object({
  customerName: z
    .string({ required_error: 'Customer name is required.' })
    .trim()
    .min(2, 'Customer name must be at least 2 characters.')
    .max(255, 'Customer name cannot exceed 255 characters.'),
  customerEmail: z
    .string({ required_error: 'Customer email is required.' })
    .trim()
    .email('Please provide a valid email address.')
    .max(255, 'Email cannot exceed 255 characters.'),
  customerPhone: z
    .string()
    .trim()
    .max(50, 'Phone number cannot exceed 50 characters.')
    .optional()
    .nullable(),
  orderId: z
    .string({ required_error: 'Order ID is required.' })
    .trim()
    .min(1, 'Order ID cannot be empty.')
    .max(100, 'Order ID cannot exceed 100 characters.'),
  itemSku: z
    .string({ required_error: 'Item SKU is required.' })
    .trim()
    .min(1, 'Item SKU cannot be empty.')
    .max(100, 'Item SKU cannot exceed 100 characters.'),
  itemName: z
    .string({ required_error: 'Item name is required.' })
    .trim()
    .min(1, 'Item name cannot be empty.')
    .max(255, 'Item name cannot exceed 255 characters.'),
  quantity: z
    .number({ required_error: 'Quantity is required.' })
    .int('Quantity must be an integer.')
    .min(1, 'Quantity must be at least 1 unit.'),
  reason: ReturnReasonEnum,
  initialNote: z.string().trim().max(2000).optional().nullable(),
});

export const updateRequestSchema = z
  .object({
    customerName: z.string().trim().min(2).max(255).optional(),
    customerEmail: z.string().trim().email().max(255).optional(),
    customerPhone: z.string().trim().max(50).optional().nullable(),
    orderId: z.string().trim().min(1).max(100).optional(),
    itemSku: z.string().trim().min(1).max(100).optional(),
    itemName: z.string().trim().min(1).max(255).optional(),
    quantity: z.number().int().min(1).optional(),
    reason: ReturnReasonEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one editable field must be provided for update.',
  });

export const transitionStatusSchema = z.object({
  status: RequestStatusEnum,
  resolution: ResolutionTypeEnum.optional().nullable(),
  refundAmount: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const createNoteSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(1, 'Author name cannot be empty.')
    .max(255)
    .default('Support Agent'),
  content: z
    .string({ required_error: 'Note content is required.' })
    .trim()
    .min(1, 'Note content cannot be empty.')
    .max(3000, 'Note cannot exceed 3000 characters.'),
});

export const requestQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  status: z
    .string()
    .optional()
    .transform((val) => (val && val !== 'ALL' ? val : undefined)),
  reason: z
    .string()
    .optional()
    .transform((val) => (val && val !== 'ALL' ? val : undefined)),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'customerName', 'orderId', 'status', 'reference'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
