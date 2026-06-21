import { RequestStatus } from '@prisma/client';

import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { requestStatusSchema } from '@/features/card/schemas';
import { updateConsultationRequestStatus } from '@/features/card/service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const input = requestStatusSchema.parse(await request.json());
    const result = await updateConsultationRequestStatus(
      id,
      input.status as RequestStatus,
      user
    );

    return jsonOk(result);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
