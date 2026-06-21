import { NextResponse } from 'next/server';

import { handleOAuthCallback } from '@/server/auth';
import { logError, logInfo, logWarn } from '@/server/logger';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  if (providerError) {
    logWarn('auth.oauth_callback.provider_error', { provider: 'os7' });
    return NextResponse.redirect(new URL('/?auth=failed', request.url));
  }

  if (!code || !state) {
    logWarn('auth.oauth_callback.invalid_params', { provider: 'os7' });
    return NextResponse.redirect(new URL('/?auth=failed', request.url));
  }

  try {
    await handleOAuthCallback({ code, origin, state });
    logInfo('auth.oauth_callback.finished', { provider: 'os7' });
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    logError('auth.oauth_callback.failed', {
      error: error instanceof Error ? error.message : String(error),
      provider: 'os7'
    });
    return NextResponse.redirect(new URL('/?auth=failed', request.url));
  }
}
