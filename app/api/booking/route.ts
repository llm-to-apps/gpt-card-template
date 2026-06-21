import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { bookingCreateSchema } from '@/features/card/schemas';
import { createConsultationRequest } from '@/features/card/service';

export async function POST(request: Request) {
  try {
    const input = bookingCreateSchema.parse(await request.json());
    const booking = await createConsultationRequest(input);

    return jsonOk(booking);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
