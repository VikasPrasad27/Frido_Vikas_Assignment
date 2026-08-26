import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReturnService, ALLOWED_TRANSITIONS } from '@/lib/services/returnService';
import { Errors, ApiError } from '@/lib/errors';
import prisma from '@/lib/db';

vi.mock('@/lib/db', () => ({
  default: {
    returnRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    note: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((fnOrArray) => {
      if (typeof fnOrArray === 'function') {
        return fnOrArray({
          returnRequest: {
            update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...data })),
          },
          note: {
            create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'note-1', ...data })),
          },
        });
      }
      return Promise.all(fnOrArray);
    }),
  },
}));

describe('Business Rule 1: Status Lifecycle Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows valid lifecycle progression (OPEN -> IN_REVIEW)', async () => {
    const mockRequest = {
      id: 'req-1',
      status: 'OPEN',
      reference: 'RET-2026-00001',
      deletedAt: null,
      notes: [],
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    // Spy on getRequestById for final return
    vi.spyOn(ReturnService, 'getRequestById').mockResolvedValue({
      ...mockRequest,
      status: 'IN_REVIEW',
    });

    const result = await ReturnService.transitionStatus('req-1', {
      status: 'IN_REVIEW',
    });

    expect(result.status).toBe('IN_REVIEW');
  });

  it('allows valid lifecycle progression (IN_REVIEW -> APPROVED with valid resolution)', async () => {
    const mockRequest = {
      id: 'req-2',
      status: 'IN_REVIEW',
      reference: 'RET-2026-00002',
      deletedAt: null,
      notes: [],
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);
    vi.spyOn(ReturnService, 'getRequestById').mockResolvedValue({
      ...mockRequest,
      status: 'APPROVED',
      resolution: 'REPLACEMENT',
    });

    const result = await ReturnService.transitionStatus('req-2', {
      status: 'APPROVED',
      resolution: 'REPLACEMENT',
    });

    expect(result.status).toBe('APPROVED');
  });

  it('allows valid rejection from IN_REVIEW (IN_REVIEW -> REJECTED)', async () => {
    const mockRequest = {
      id: 'req-3',
      status: 'IN_REVIEW',
      reference: 'RET-2026-00003',
      deletedAt: null,
      notes: [],
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);
    vi.spyOn(ReturnService, 'getRequestById').mockResolvedValue({
      ...mockRequest,
      status: 'REJECTED',
    });

    const result = await ReturnService.transitionStatus('req-3', {
      status: 'REJECTED',
      note: 'Item not eligible for return.',
    });

    expect(result.status).toBe('REJECTED');
  });

  it('allows valid completion from APPROVED (APPROVED -> COMPLETED)', async () => {
    const mockRequest = {
      id: 'req-4',
      status: 'APPROVED',
      resolution: 'REFUND',
      refundAmount: 50.0,
      reference: 'RET-2026-00004',
      deletedAt: null,
      notes: [],
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);
    vi.spyOn(ReturnService, 'getRequestById').mockResolvedValue({
      ...mockRequest,
      status: 'COMPLETED',
    });

    const result = await ReturnService.transitionStatus('req-4', {
      status: 'COMPLETED',
    });

    expect(result.status).toBe('COMPLETED');
  });

  it('refuses illegal transition from OPEN straight to APPROVED', async () => {
    const mockRequest = {
      id: 'req-5',
      status: 'OPEN',
      reference: 'RET-2026-00005',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-5', {
        status: 'APPROVED',
        resolution: 'STORE_CREDIT',
      })
    ).rejects.toThrowError(/Illegal transition from 'OPEN' to 'APPROVED'/i);
  });

  it('refuses illegal transition from OPEN straight to COMPLETED', async () => {
    const mockRequest = {
      id: 'req-6',
      status: 'OPEN',
      reference: 'RET-2026-00006',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-6', {
        status: 'COMPLETED',
      })
    ).rejects.toThrow(ApiError);
  });

  it('refuses illegal transition from APPROVED to REJECTED', async () => {
    const mockRequest = {
      id: 'req-7',
      status: 'APPROVED',
      reference: 'RET-2026-00007',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-7', {
        status: 'REJECTED',
      })
    ).rejects.toThrow(ApiError);
  });

  it('refuses any transition out of terminal state REJECTED', async () => {
    const mockRequest = {
      id: 'req-8',
      status: 'REJECTED',
      reference: 'RET-2026-00008',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-8', {
        status: 'OPEN',
      })
    ).rejects.toThrowError(/Illegal transition/i);
  });

  it('refuses any transition out of terminal state COMPLETED', async () => {
    const mockRequest = {
      id: 'req-9',
      status: 'COMPLETED',
      reference: 'RET-2026-00009',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-9', {
        status: 'APPROVED',
      })
    ).rejects.toThrow(ApiError);
  });
});

describe('Business Rule 2: Approval Requires Resolution & Refund Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses APPROVAL when resolution is omitted', async () => {
    const mockRequest = {
      id: 'req-10',
      status: 'IN_REVIEW',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-10', {
        status: 'APPROVED',
        resolution: null,
      })
    ).rejects.toThrowError(/requires a resolution/i);
  });

  it('refuses REFUND resolution when refundAmount is missing or 0', async () => {
    const mockRequest = {
      id: 'req-11',
      status: 'IN_REVIEW',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-11', {
        status: 'APPROVED',
        resolution: 'REFUND',
        refundAmount: 0,
      })
    ).rejects.toThrowError(/requires a refund amount greater than 0.00/i);
  });

  it('refuses REFUND resolution when refundAmount is negative', async () => {
    const mockRequest = {
      id: 'req-12',
      status: 'IN_REVIEW',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-12', {
        status: 'APPROVED',
        resolution: 'REFUND',
        refundAmount: -25.5,
      })
    ).rejects.toThrowError(/requires a refund amount greater than 0.00/i);
  });

  it('refuses non-refund resolution (REPLACEMENT) when a refundAmount is provided', async () => {
    const mockRequest = {
      id: 'req-13',
      status: 'IN_REVIEW',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);

    await expect(
      ReturnService.transitionStatus('req-13', {
        status: 'APPROVED',
        resolution: 'REPLACEMENT',
        refundAmount: 49.99,
      })
    ).rejects.toThrowError(/Refund amount cannot be recorded for non-refund resolutions/i);
  });

  it('accepts valid REFUND resolution with positive amount', async () => {
    const mockRequest = {
      id: 'req-14',
      status: 'IN_REVIEW',
      deletedAt: null,
    };
    prisma.returnRequest.findFirst.mockResolvedValue(mockRequest);
    vi.spyOn(ReturnService, 'getRequestById').mockResolvedValue({
      ...mockRequest,
      status: 'APPROVED',
      resolution: 'REFUND',
      refundAmount: 99.95,
    });

    const result = await ReturnService.transitionStatus('req-14', {
      status: 'APPROVED',
      resolution: 'REFUND',
      refundAmount: 99.95,
    });

    expect(result.status).toBe('APPROVED');
    expect(result.resolution).toBe('REFUND');
    expect(result.refundAmount).toBe(99.95);
  });
});

describe('Business Rule 3: One Live Request Per Item', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses creation when an active live request exists for same order and item', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'existing-req',
      reference: 'RET-2026-ACTIVE1',
      orderId: 'ORD-999',
      itemSku: 'SKU-SHIRT-M',
      status: 'IN_REVIEW',
      deletedAt: null,
    });

    await expect(
      ReturnService.createRequest({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        orderId: 'ORD-999',
        itemSku: 'SKU-SHIRT-M',
        itemName: 'Shirt Medium',
        quantity: 1,
        reason: 'SIZE_ISSUE',
      })
    ).rejects.toThrowError(/A live return request \(RET-2026-ACTIVE1\) already exists/i);
  });

  it('allows creation when previous request was REJECTED or COMPLETED (closed)', async () => {
    // No live request found
    prisma.returnRequest.findFirst.mockResolvedValue(null);
    prisma.returnRequest.findUnique.mockResolvedValue(null); // reference is unique
    prisma.returnRequest.create.mockResolvedValue({
      id: 'new-req-1',
      reference: 'RET-2026-NEW01',
      orderId: 'ORD-999',
      itemSku: 'SKU-SHIRT-M',
      status: 'OPEN',
      deletedAt: null,
      notes: [],
    });

    const created = await ReturnService.createRequest({
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      orderId: 'ORD-999',
      itemSku: 'SKU-SHIRT-M',
      itemName: 'Shirt Medium',
      quantity: 1,
      reason: 'SIZE_ISSUE',
    });

    expect(created.status).toBe('OPEN');
    expect(created.reference).toBeDefined();
  });
});

describe('Business Rule 4: Locked Once Decided', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses editing customer/item details on an APPROVED request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'decided-req-1',
      status: 'APPROVED',
      orderId: 'ORD-100',
      itemSku: 'SKU-1',
      deletedAt: null,
    });

    await expect(
      ReturnService.updateRequest('decided-req-1', {
        customerName: 'Updated Name',
      })
    ).rejects.toThrowError(/Customer and item details cannot be edited because this request has already been decided \(APPROVED\)/i);
  });

  it('refuses editing customer/item details on a REJECTED request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'decided-req-2',
      status: 'REJECTED',
      orderId: 'ORD-100',
      itemSku: 'SKU-1',
      deletedAt: null,
    });

    await expect(
      ReturnService.updateRequest('decided-req-2', {
        quantity: 3,
      })
    ).rejects.toThrow(ApiError);
  });

  it('refuses editing customer/item details on a COMPLETED request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'decided-req-3',
      status: 'COMPLETED',
      orderId: 'ORD-100',
      itemSku: 'SKU-1',
      deletedAt: null,
    });

    await expect(
      ReturnService.updateRequest('decided-req-3', {
        reason: 'DAMAGED',
      })
    ).rejects.toThrow(ApiError);
  });

  it('allows adding notes at any stage even when decided/completed', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'decided-req-4',
      status: 'COMPLETED',
      deletedAt: null,
    });
    prisma.note.create.mockResolvedValue({
      id: 'note-new',
      requestId: 'decided-req-4',
      authorName: 'Support Agent',
      content: 'Follow-up note on completed case.',
      createdAt: new Date(),
    });

    const note = await ReturnService.addNote('decided-req-4', {
      authorName: 'Support Agent',
      content: 'Follow-up note on completed case.',
    });

    expect(note.content).toBe('Follow-up note on completed case.');
  });
});

describe('Business Rule 5: Soft Removal Constraints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows removal of an OPEN request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'open-req',
      reference: 'RET-2026-OPEN01',
      status: 'OPEN',
      deletedAt: null,
    });
    prisma.returnRequest.update.mockResolvedValue({
      id: 'open-req',
      deletedAt: new Date(),
    });

    const result = await ReturnService.removeRequest('open-req');
    expect(result.message).toContain('successfully removed');
  });

  it('allows removal of a REJECTED request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'rej-req',
      reference: 'RET-2026-REJ01',
      status: 'REJECTED',
      deletedAt: null,
    });
    prisma.returnRequest.update.mockResolvedValue({
      id: 'rej-req',
      deletedAt: new Date(),
    });

    const result = await ReturnService.removeRequest('rej-req');
    expect(result.message).toContain('successfully removed');
  });

  it('refuses removal of an IN_REVIEW request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'review-req',
      status: 'IN_REVIEW',
      deletedAt: null,
    });

    await expect(ReturnService.removeRequest('review-req')).rejects.toThrowError(
      /Cannot remove request in 'IN_REVIEW' status/i
    );
  });

  it('refuses removal of an APPROVED request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'app-req',
      status: 'APPROVED',
      deletedAt: null,
    });

    await expect(ReturnService.removeRequest('app-req')).rejects.toThrowError(
      /Cannot remove request in 'APPROVED' status/i
    );
  });

  it('refuses removal of a COMPLETED request', async () => {
    prisma.returnRequest.findFirst.mockResolvedValue({
      id: 'comp-req',
      status: 'COMPLETED',
      deletedAt: null,
    });

    await expect(ReturnService.removeRequest('comp-req')).rejects.toThrowError(
      /Cannot remove request in 'COMPLETED' status/i
    );
  });
});
