import { getCurrentUser } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { getCardSnapshot } from '@/features/card/service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const weekStartParam = url.searchParams.get('weekStart');
    const weekStart =
      weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)
        ? new Date(`${weekStartParam}T00:00:00.000Z`)
        : undefined;
    const user = await getCurrentUser();
    const isAdmin = user?.role === 'admin';
    const snapshot = await getCardSnapshot({
      includeRequests: isAdmin,
      isAdmin,
      weekStart
    });

    return jsonOk(snapshot);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
