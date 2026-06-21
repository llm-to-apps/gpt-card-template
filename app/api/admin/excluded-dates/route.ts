import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { excludedDateCreateSchema } from '@/features/card/schemas';
import { createExcludedDate } from '@/features/card/service';

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const input = excludedDateCreateSchema.parse(await request.json());
    const excludedDate = await createExcludedDate(input, user);

    return jsonOk(excludedDate);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
