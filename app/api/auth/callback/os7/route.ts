import { NextResponse } from 'next/server';

import { consumeOAuthNextPath, handleOAuthCallback } from '@/server/auth';
import { logError, logInfo, logWarn } from '@/server/logger';
import { publicOrigin } from '@/server/request-origin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = await publicOrigin();
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  if (providerError) {
    logWarn('auth.oauth_callback.provider_error', { provider: 'os7' });
    return NextResponse.redirect(
      new URL(`/api/auth/login?interactive=1&error=${providerError}`, origin)
    );
  }

  if (!code || !state) {
    logWarn('auth.oauth_callback.invalid_params', { provider: 'os7' });
    return NextResponse.redirect(
      new URL('/api/auth/login?error=invalid_callback', origin)
    );
  }

  try {
    await handleOAuthCallback({ code, origin, state });
    logInfo('auth.oauth_callback.finished', { provider: 'os7' });
    return NextResponse.redirect(new URL(await consumeOAuthNextPath(), origin));
  } catch (error) {
    logError('auth.oauth_callback.failed', {
      error: error instanceof Error ? error.message : String(error),
      provider: 'os7'
    });
    return NextResponse.redirect(
      new URL('/api/auth/login?interactive=1&error=callback_failed', origin)
    );
  }
}
