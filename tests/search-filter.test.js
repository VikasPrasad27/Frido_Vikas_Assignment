import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReturnService } from '@/lib/services/returnService';
import prisma from '@/lib/db';

vi.mock('@/lib/db', () => ({
  default: {
    returnRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

describe('Server-Side Search, Filter, Sort & Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters requests by status and excludes soft-deleted items by default', async () => {
    prisma.returnRequest.count.mockResolvedValue(5);
    prisma.returnRequest.findMany.mockResolvedValue([
      { id: '1', reference: 'RET-1', status: 'OPEN', deletedAt: null },
      { id: '2', reference: 'RET-2', status: 'OPEN', deletedAt: null },
    ]);

    const result = await ReturnService.listRequests({
      status: 'OPEN',
      page: 1,
      limit: 10,
    });

    expect(result.requests.length).toBe(2);
    expect(result.meta.total).toBe(5);
    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: 'OPEN',
        }),
      })
    );
  });

  it('constructs multi-field OR search across customer, email, order, reference, and item', async () => {
    prisma.returnRequest.count.mockResolvedValue(1);
    prisma.returnRequest.findMany.mockResolvedValue([
      { id: '1', reference: 'RET-2026-A1B2C', customerName: 'Aarav Sharma', deletedAt: null },
    ]);

    await ReturnService.listRequests({
      q: 'Aarav',
    });

    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          OR: expect.arrayContaining([
            { customerName: { contains: 'Aarav', mode: 'insensitive' } },
            { customerEmail: { contains: 'Aarav', mode: 'insensitive' } },
            { orderId: { contains: 'Aarav', mode: 'insensitive' } },
            { reference: { contains: 'Aarav', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  it('calculates pagination math correctly (page 2 with limit 5 for total 14)', async () => {
    prisma.returnRequest.count.mockResolvedValue(14);
    prisma.returnRequest.findMany.mockResolvedValue([]);

    const result = await ReturnService.listRequests({
      page: 2,
      limit: 5,
    });

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.total).toBe(14);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPrevPage).toBe(true);

    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      })
    );
  });
});
