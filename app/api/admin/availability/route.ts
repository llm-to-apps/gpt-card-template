import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { availabilitySlotCreateSchema } from '@/features/card/schemas';
import { createAvailabilitySlot } from '@/features/card/service';

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const input = availabilitySlotCreateSchema.parse(await request.json());
    const slot = await createAvailabilitySlot(input, user);

    return jsonOk(slot);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
