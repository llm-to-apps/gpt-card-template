import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { profileUpdateSchema } from '@/features/card/schemas';
import { updateProfile } from '@/features/card/service';
import { getActiveLocale } from '@/i18n/server';

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    const locale = await getActiveLocale();
    const input = profileUpdateSchema.parse(await request.json());
    const profile = await updateProfile(input, user, locale);

    return jsonOk(profile);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
