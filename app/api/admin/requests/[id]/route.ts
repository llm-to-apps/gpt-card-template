import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { consultationRequestUpdateSchema } from '@/features/card/schemas';
import { updateConsultationRequest } from '@/features/card/service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const input = consultationRequestUpdateSchema.parse(await request.json());
    const result = await updateConsultationRequest(id, input, user);

    return jsonOk(result);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
