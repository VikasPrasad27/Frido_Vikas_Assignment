import { ReturnService } from '@/lib/services/returnService';
import { successResponse, errorResponse } from '@/lib/errors';

/**
 * GET /api/requests/stats
 * Return overall counts for dashboard stats
 */
export async function GET() {
  try {
    const stats = await ReturnService.getStats();
    return successResponse(stats);
  } catch (error) {
    return errorResponse(error);
  }
}
