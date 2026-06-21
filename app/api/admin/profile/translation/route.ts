import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { deleteProfileTranslation } from '@/features/card/service';
import { getActiveLocale } from '@/i18n/server';

export async function DELETE() {
  try {
    const user = await requireAdmin();
    const locale = await getActiveLocale();
    const result = await deleteProfileTranslation(user, locale);

    return jsonOk(result);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
