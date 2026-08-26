import { ReturnService } from '@/lib/services/returnService';
import { updateRequestSchema } from '@/lib/validators';
import { successResponse, errorResponse } from '@/lib/errors';

/**
 * GET /api/requests/:id
 * Retrieve details for a single return request
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const returnRequest = await ReturnService.getRequestById(id);
    return successResponse(returnRequest);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/requests/:id
 * Edit customer/item details (Allowed only before decided - Rule 4)
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateRequestSchema.parse(body);

    const updated = await ReturnService.updateRequest(id, validatedData);
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/requests/:id
 * Soft removal of a request (Allowed only for OPEN or REJECTED - Rule 5)
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const result = await ReturnService.removeRequest(id);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
