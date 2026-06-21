import { CardApp, type CardSection } from '@/features/card/card-app';
import { getCardSnapshot } from '@/features/card/service';
import { getCurrentUser } from '@/server/auth';

export async function renderCardPage(section: CardSection) {
  const weekStart = formatDateOnly(startOfWeek(new Date()));
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const snapshot = await getCardSnapshot({
    includeRequests: isAdmin,
    isAdmin,
    weekStart: parseDateOnly(weekStart)
  });

  return (
    <CardApp
      initialSection={section}
      initialSnapshot={snapshot}
      initialWeekStart={weekStart}
    />
  );
}

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -date.getUTCDay());
}

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
