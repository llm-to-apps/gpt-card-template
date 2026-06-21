import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { exceptionCreateSchema } from '@/features/card/schemas';
import { createException } from '@/features/card/service';

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const input = exceptionCreateSchema.parse(await request.json());
    const exception = await createException(input, user);

    return jsonOk(exception);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
