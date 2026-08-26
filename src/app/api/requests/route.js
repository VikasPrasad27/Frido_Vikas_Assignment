import { ReturnService } from '@/lib/services/returnService';
import { createRequestSchema, requestQuerySchema } from '@/lib/validators';
import { successResponse, errorResponse } from '@/lib/errors';

/**
 * GET /api/requests
 * Server-side list, search, filter, sort, and pagination
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryObj = Object.fromEntries(searchParams.entries());

    const validatedQuery = requestQuerySchema.parse(queryObj);
    const result = await ReturnService.listRequests(validatedQuery);

    return successResponse(result.requests, result.meta);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/requests
 * Create a new return request (Auto-assigns reference, enforces Rule 3)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    const newRequest = await ReturnService.createRequest(validatedData);
    return successResponse(newRequest, null, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
