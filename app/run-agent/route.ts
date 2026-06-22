import { NextResponse } from 'next/server';

import { getCardSnapshot } from '@/features/card/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const snapshot = await getCardSnapshot();
  const target = snapshot.profile.agentChatUrl?.trim();

  if (!target) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    return NextResponse.redirect(new URL(target));
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
