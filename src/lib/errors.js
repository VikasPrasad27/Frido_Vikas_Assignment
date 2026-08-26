import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Standard HTTP error factories for domain and business rules
 */
export const Errors = {
  badRequest: (message, details = [], code = 'BAD_REQUEST') =>
    new ApiError(400, code, message, details),

  notFound: (message = 'Resource not found', code = 'NOT_FOUND') =>
    new ApiError(404, code, message),

  conflict: (message, code = 'CONFLICT', details = []) =>
    new ApiError(409, code, message, details),

  unprocessable: (message, code = 'UNPROCESSABLE_ENTITY', details = []) =>
    new ApiError(422, code, message, details),

  // Specific domain business rule errors
  invalidTransition: (fromStatus, toStatus) =>
    new ApiError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Illegal transition from '${fromStatus}' to '${toStatus}'. Only valid lifecycle steps are allowed.`,
      [
        {
          field: 'status',
          issue: `Valid transitions: OPEN -> IN_REVIEW -> APPROVED -> COMPLETED or IN_REVIEW -> REJECTED.`,
        },
      ]
    ),

  resolutionRequired: () =>
    new ApiError(
      422,
      'RESOLUTION_REQUIRED',
      'Approving a return request requires a resolution (Refund, Replacement, or Store Credit).',
      [{ field: 'resolution', issue: 'Resolution is mandatory when approving a request.' }]
    ),

  refundAmountRequired: () =>
    new ApiError(
      422,
      'REFUND_AMOUNT_REQUIRED',
      'Refund resolution requires a refund amount greater than 0.00.',
      [{ field: 'refundAmount', issue: 'Must be a positive decimal number greater than 0.' }]
    ),

  refundAmountProhibited: () =>
    new ApiError(
      422,
      'REFUND_AMOUNT_NOT_PERMITTED',
      'Refund amount cannot be recorded for non-refund resolutions (Replacement or Store Credit).',
      [{ field: 'refundAmount', issue: 'Must be null or omitted when resolution is not REFUND.' }]
    ),

  duplicateLiveRequest: (reference, orderId, itemSku) =>
    new ApiError(
      409,
      'DUPLICATE_LIVE_REQUEST',
      `A live return request (${reference}) already exists for Order '${orderId}' and Item '${itemSku}'.`,
      [
        {
          field: 'itemSku',
          issue: 'Customer cannot have two live return requests for the same order and item.',
        },
      ]
    ),

  requestLocked: (status) =>
    new ApiError(
      422,
      'REQUEST_LOCKED',
      `Customer and item details cannot be edited because this request has already been decided (${status}).`,
      [{ field: 'status', issue: 'Details are permanently locked once a decision is made.' }]
    ),

  cannotRemoveRequest: (status) =>
    new ApiError(
      422,
      'INVALID_REMOVAL_STATUS',
      `Cannot remove request in '${status}' status. Only 'OPEN' or 'REJECTED' requests may be removed from the desk.`,
      [{ field: 'status', issue: 'Only Open or Rejected requests can be taken off the desk.' }]
    ),
};

/**
 * Creates a standardized JSON success response
 */
export function successResponse(data, meta = null, status = 200) {
  const body = {
    success: true,
    data,
  };
  if (meta) {
    body.meta = meta;
  }
  return NextResponse.json(body, { status });
}

/**
 * Creates a standardized JSON error response
 */
export function errorResponse(error) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const formattedDetails = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request payload failed input validation.',
          details: formattedDetails,
        },
      },
      { status: 400 }
    );
  }

  // Handle unexpected errors (never leak raw stack in production)
  console.error('Unhandled API Error:', error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred. Please try again later.',
        details: [],
      },
    },
    { status: 500 }
  );
}
