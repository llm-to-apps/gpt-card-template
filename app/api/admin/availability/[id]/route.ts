import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { availabilitySlotUpdateSchema } from '@/features/card/schemas';
import {
  deleteAvailabilitySlot,
  updateAvailabilitySlot
} from '@/features/card/service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const input = availabilitySlotUpdateSchema.parse(await request.json());
    const slot = await updateAvailabilitySlot(id, input, user);

    return jsonOk(slot);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const result = await deleteAvailabilitySlot(id, user);

    return jsonOk(result);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
