import { ReturnService } from '@/lib/services/returnService';
import { createNoteSchema } from '@/lib/validators';
import { successResponse, errorResponse } from '@/lib/errors';

/**
 * GET /api/requests/:id/notes
 * Fetch all chronological notes for a return request
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const req = await ReturnService.getRequestById(id);
    return successResponse(req.notes || []);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/requests/:id/notes
 * Append an immutable note to a return request
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = createNoteSchema.parse(body);

    const newNote = await ReturnService.addNote(id, validatedData);
    return successResponse(newNote, null, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
