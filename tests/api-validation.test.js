import { describe, it, expect } from 'vitest';
import {
  createRequestSchema,
  updateRequestSchema,
  transitionStatusSchema,
  createNoteSchema,
  requestQuerySchema,
} from '@/lib/validators';
import { Errors, ApiError, successResponse, errorResponse } from '@/lib/errors';
import { generateReferenceCode } from '@/lib/reference';

describe('Validation Layer & Input Schemas', () => {
  it('validates a valid create return request payload', () => {
    const validData = {
      customerName: 'Alice Smith',
      customerEmail: 'alice@example.com',
      orderId: 'ORD-7788',
      itemSku: 'SKU-JEANS-30',
      itemName: 'Denim Jeans (30)',
      quantity: 2,
      reason: 'SIZE_ISSUE',
      initialNote: 'Customer requests exchange.',
    };

    const parsed = createRequestSchema.parse(validData);
    expect(parsed.customerName).toBe('Alice Smith');
    expect(parsed.quantity).toBe(2);
    expect(parsed.reason).toBe('SIZE_ISSUE');
  });

  it('rejects invalid email in create request', () => {
    const invalidData = {
      customerName: 'Alice Smith',
      customerEmail: 'not-an-email',
      orderId: 'ORD-7788',
      itemSku: 'SKU-JEANS-30',
      itemName: 'Denim Jeans',
      quantity: 1,
      reason: 'DAMAGED',
    };

    expect(() => createRequestSchema.parse(invalidData)).toThrow();
  });

  it('rejects zero or negative quantity in create request', () => {
    const invalidData = {
      customerName: 'Alice Smith',
      customerEmail: 'alice@example.com',
      orderId: 'ORD-7788',
      itemSku: 'SKU-JEANS-30',
      itemName: 'Denim Jeans',
      quantity: 0,
      reason: 'DAMAGED',
    };

    expect(() => createRequestSchema.parse(invalidData)).toThrow();
  });

  it('rejects invalid return reason enum value', () => {
    const invalidData = {
      customerName: 'Alice Smith',
      customerEmail: 'alice@example.com',
      orderId: 'ORD-7788',
      itemSku: 'SKU-JEANS-30',
      itemName: 'Denim Jeans',
      quantity: 1,
      reason: 'UNKNOWN_REASON',
    };

    expect(() => createRequestSchema.parse(invalidData)).toThrow();
  });

  it('rejects empty update payload', () => {
    expect(() => updateRequestSchema.parse({})).toThrow();
  });

  it('validates status transition schema with refund amount transform', () => {
    const data = {
      status: 'APPROVED',
      resolution: 'REFUND',
      refundAmount: '49.99',
    };

    const parsed = transitionStatusSchema.parse(data);
    expect(parsed.status).toBe('APPROVED');
    expect(parsed.resolution).toBe('REFUND');
    expect(parsed.refundAmount).toBe(49.99);
  });

  it('validates query parameter schema defaults', () => {
    const query = requestQuerySchema.parse({});
    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
    expect(query.sortBy).toBe('createdAt');
    expect(query.sortOrder).toBe('desc');
  });

  it('generates a valid human-readable reference code in RET-YYYY-XXXXX format', () => {
    const ref = generateReferenceCode(2026);
    expect(ref).toMatch(/^RET-2026-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
  });
});

describe('Error Handling & HTTP Envelopes', () => {
  it('creates structured ApiError instances with custom HTTP codes', () => {
    const err = Errors.duplicateLiveRequest('RET-2026-11111', 'ORD-1', 'SKU-1');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('DUPLICATE_LIVE_REQUEST');
    expect(err.message).toContain('RET-2026-11111');
  });

  it('formats errorResponse into standard JSON format with status code', async () => {
    const apiErr = Errors.invalidTransition('OPEN', 'APPROVED');
    const response = errorResponse(apiErr);
    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(json.error.details.length).toBeGreaterThan(0);
  });
});
