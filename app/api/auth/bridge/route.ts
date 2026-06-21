import { NextResponse } from 'next/server';

import {
  createOAuthRequest,
  getCurrentUser,
  rememberOAuthNextPath
} from '@/server/auth';
import { isLocalAuthMode } from '@/server/env';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { publicOrigin } from '@/server/request-origin';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (user?.role === 'admin') {
      return jsonOk({ authenticated: true });
    }

    const url = new URL(request.url);
    const nextPath = safeNextPath(url.searchParams.get('next'));

    if (isLocalAuthMode()) {
      return jsonOk({
        authenticated: false,
        localLoginUrl: `/api/auth/login?next=${encodeURIComponent(nextPath)}`
      });
    }

    await rememberOAuthNextPath(nextPath);
    const oauthRequest = await createOAuthRequest(await publicOrigin());

    return jsonOk({
      authenticated: false,
      oauthRequest: {
        ...oauthRequest,
        nextPath
      }
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}

function safeNextPath(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}
