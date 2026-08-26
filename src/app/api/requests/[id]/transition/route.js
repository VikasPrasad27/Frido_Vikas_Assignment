import { ReturnService } from '@/lib/services/returnService';
import { transitionStatusSchema } from '@/lib/validators';
import { successResponse, errorResponse } from '@/lib/errors';

/**
 * POST /api/requests/:id/transition
 * Transition request status (Rules 1 & 2)
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = transitionStatusSchema.parse(body);

    const updated = await ReturnService.transitionStatus(id, validatedData);
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
