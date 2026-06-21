import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { profileUpdateSchema } from '@/features/card/schemas';
import { updateProfile } from '@/features/card/service';

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    const input = profileUpdateSchema.parse(await request.json());
    const profile = await updateProfile(input, user);

    return jsonOk(profile);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
