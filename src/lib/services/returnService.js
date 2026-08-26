import prisma from '@/lib/db';
import { Errors } from '@/lib/errors';
import { generateReferenceCode } from '@/lib/reference';

/**
 * Valid lifecycle state transitions according to Rule 1
 */
export const ALLOWED_TRANSITIONS = {
  OPEN: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
};

export const DECIDED_STATUSES = ['APPROVED', 'REJECTED', 'COMPLETED'];
export const LIVE_STATUSES = ['OPEN', 'IN_REVIEW', 'APPROVED'];
export const REMOVABLE_STATUSES = ['OPEN', 'REJECTED'];

/**
 * Business Rules & Domain Service for ReturnDesk
 */
export const ReturnService = {
  /**
   * List return requests with server-side search, filtering, sorting, and pagination.
   */
  async listRequests(params = {}) {
    const {
      q = '',
      status,
      reason,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = params;

    const skip = (page - 1) * limit;
    const take = limit;

    // Base filter: always exclude soft-deleted records from standard queries
    const where = {
      deletedAt: null,
    };

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Reason filter
    if (reason && reason !== 'ALL') {
      where.reason = reason;
    }

    // Search filter across customer info, order, reference, item
    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { customerName: { contains: searchTerm, mode: 'insensitive' } },
        { customerEmail: { contains: searchTerm, mode: 'insensitive' } },
        { orderId: { contains: searchTerm, mode: 'insensitive' } },
        { reference: { contains: searchTerm, mode: 'insensitive' } },
        { itemName: { contains: searchTerm, mode: 'insensitive' } },
        { itemSku: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Dynamic sorting
    const orderBy = {
      [sortBy]: sortOrder,
    };

    const [total, requests] = await prisma.$transaction([
      prisma.returnRequest.count({ where }),
      prisma.returnRequest.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          _count: {
            select: { notes: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      requests: requests.map((req) => ({
        ...req,
        refundAmount: req.refundAmount ? Number(req.refundAmount) : null,
        notesCount: req._count?.notes ?? 0,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  },

  /**
   * Fetch a single request by ID with chronological notes.
   * Throws 404 if not found or soft-deleted.
   */
  async getRequestById(id) {
    const request = await prisma.returnRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' }, // Chronological order
        },
      },
    });

    if (!request) {
      throw Errors.notFound(`Return request with ID '${id}' was not found.`);
    }

    return {
      ...request,
      refundAmount: request.refundAmount ? Number(request.refundAmount) : null,
    };
  },

  /**
   * Create a new return request.
   * Enforces Rule 3 (one live request per order + item).
   * Generates a unique human-readable reference (RET-YYYY-XXXXX).
   */
  async createRequest(data) {
    const {
      customerName,
      customerEmail,
      customerPhone,
      orderId,
      itemSku,
      itemName,
      quantity,
      reason,
      initialNote,
    } = data;

    // Rule 3: Check for existing live request for the same order and item
    const existingLive = await prisma.returnRequest.findFirst({
      where: {
        orderId,
        itemSku,
        deletedAt: null,
        status: { in: LIVE_STATUSES },
      },
    });

    if (existingLive) {
      throw Errors.duplicateLiveRequest(existingLive.reference, orderId, itemSku);
    }

    // Generate unique reference (with collision retry if ever needed)
    let reference = generateReferenceCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const exists = await prisma.returnRequest.findUnique({
        where: { reference },
      });
      if (!exists) {
        isUnique = true;
      } else {
        reference = generateReferenceCode();
        attempts++;
      }
    }

    // Create record + initial note if provided
    const newRequest = await prisma.returnRequest.create({
      data: {
        reference,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        orderId,
        itemSku,
        itemName,
        quantity,
        reason,
        status: 'OPEN',
        notes: initialNote
          ? {
              create: {
                authorName: 'Support Agent',
                content: initialNote,
              },
            }
          : undefined,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      ...newRequest,
      refundAmount: newRequest.refundAmount ? Number(newRequest.refundAmount) : null,
    };
  },

  /**
   * Update customer and item details on an undecide request.
   * Enforces Rule 4 (locked after decision: Approved, Rejected, Completed).
   * Enforces Rule 3 (if orderId or itemSku changes, ensure no other live request exists).
   */
  async updateRequest(id, data) {
    const existing = await prisma.returnRequest.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw Errors.notFound(`Return request with ID '${id}' was not found.`);
    }

    // Rule 4: Locked once decided
    if (DECIDED_STATUSES.includes(existing.status)) {
      throw Errors.requestLocked(existing.status);
    }

    // Rule 3: If orderId or itemSku is changing, verify no other live request exists
    const targetOrderId = data.orderId ?? existing.orderId;
    const targetItemSku = data.itemSku ?? existing.itemSku;

    if (targetOrderId !== existing.orderId || targetItemSku !== existing.itemSku) {
      const duplicateLive = await prisma.returnRequest.findFirst({
        where: {
          id: { not: id },
          orderId: targetOrderId,
          itemSku: targetItemSku,
          deletedAt: null,
          status: { in: LIVE_STATUSES },
        },
      });

      if (duplicateLive) {
        throw Errors.duplicateLiveRequest(duplicateLive.reference, targetOrderId, targetItemSku);
      }
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        customerName: data.customerName ?? undefined,
        customerEmail: data.customerEmail ?? undefined,
        customerPhone: data.customerPhone !== undefined ? data.customerPhone : undefined,
        orderId: data.orderId ?? undefined,
        itemSku: data.itemSku ?? undefined,
        itemName: data.itemName ?? undefined,
        quantity: data.quantity ?? undefined,
        reason: data.reason ?? undefined,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      ...updated,
      refundAmount: updated.refundAmount ? Number(updated.refundAmount) : null,
    };
  },

  /**
   * Transition request status through its lifecycle.
   * Enforces Rule 1 (strict lifecycle state machine).
   * Enforces Rule 2 (approval requires resolution; refund requires >0 amount, non-refund cannot have amount).
   */
  async transitionStatus(id, payload) {
    const { status: targetStatus, resolution, refundAmount, note } = payload;

    const existing = await prisma.returnRequest.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw Errors.notFound(`Return request with ID '${id}' was not found.`);
    }

    // Rule 1: Validate lifecycle transition
    const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw Errors.invalidTransition(existing.status, targetStatus);
    }

    // Rule 2: Approval validation
    let finalResolution = existing.resolution;
    let finalRefundAmount = existing.refundAmount ? Number(existing.refundAmount) : null;

    if (targetStatus === 'APPROVED') {
      if (!resolution) {
        throw Errors.resolutionRequired();
      }

      finalResolution = resolution;

      if (resolution === 'REFUND') {
        if (refundAmount === null || refundAmount === undefined || isNaN(refundAmount) || refundAmount <= 0) {
          throw Errors.refundAmountRequired();
        }
        finalRefundAmount = refundAmount;
      } else {
        // Replacement or Store Credit
        if (refundAmount !== null && refundAmount !== undefined && refundAmount > 0) {
          throw Errors.refundAmountProhibited();
        }
        finalRefundAmount = null;
      }
    }

    // Execute state transition & optional note in a database transaction
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id },
        data: {
          status: targetStatus,
          resolution: finalResolution,
          refundAmount: finalRefundAmount,
        },
      });

      if (note && note.trim()) {
        await tx.note.create({
          data: {
            requestId: id,
            authorName: 'Support Agent',
            content: note.trim(),
          },
        });
      }

      return result;
    });

    return this.getRequestById(id);
  },

  /**
   * Soft removal of a request from the desk.
   * Enforces Rule 5 (only Open or Rejected requests can be removed).
   */
  async removeRequest(id) {
    const existing = await prisma.returnRequest.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw Errors.notFound(`Return request with ID '${id}' was not found.`);
    }

    // Rule 5: Removal allowed only for OPEN or REJECTED
    if (!REMOVABLE_STATUSES.includes(existing.status)) {
      throw Errors.cannotRemoveRequest(existing.status);
    }

    await prisma.returnRequest.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: `Return request ${existing.reference} was successfully removed from the active desk.`,
      reference: existing.reference,
    };
  },

  /**
   * Add an immutable note to a request.
   * Notes can be added at any point in the lifecycle, even for closed/locked requests.
   */
  async addNote(requestId, data) {
    const { authorName = 'Support Agent', content } = data;

    const existing = await prisma.returnRequest.findFirst({
      where: { id: requestId, deletedAt: null },
    });

    if (!existing) {
      throw Errors.notFound(`Return request with ID '${requestId}' was not found.`);
    }

    const note = await prisma.note.create({
      data: {
        requestId,
        authorName: authorName.trim() || 'Support Agent',
        content: content.trim(),
      },
    });

    return note;
  },

  /**
   * Get dashboard metric summary
   */
  async getStats() {
    const [totalActive, openCount, inReviewCount, approvedCount, rejectedCount, completedCount] =
      await prisma.$transaction([
        prisma.returnRequest.count({ where: { deletedAt: null } }),
        prisma.returnRequest.count({ where: { deletedAt: null, status: 'OPEN' } }),
        prisma.returnRequest.count({ where: { deletedAt: null, status: 'IN_REVIEW' } }),
        prisma.returnRequest.count({ where: { deletedAt: null, status: 'APPROVED' } }),
        prisma.returnRequest.count({ where: { deletedAt: null, status: 'REJECTED' } }),
        prisma.returnRequest.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
      ]);

    return {
      totalActive,
      open: openCount,
      inReview: inReviewCount,
      approved: approvedCount,
      rejected: rejectedCount,
      completed: completedCount,
    };
  },
};
