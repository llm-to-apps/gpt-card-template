import 'server-only';

import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { prisma } from '@/server/db';
import { logInfo, logWarn } from '@/server/logger';
import {
  authSecret,
  isLocalAuthMode,
  localAdminUser,
  oauthAuthorizeUrl,
  oauthClientId,
  oauthClientSecret,
  oauthInternalTokenUrl,
  oauthInternalUserinfoUrl,
  oauthIssuerOrigin,
  os7RequestHostHeader
} from '@/server/env';
import { AppError } from '@/shared/result';

const sessionCookie = 'gpt_card_session';
const oauthStateCookie = 'gpt_card_oauth_state';
const oauthNextCookie = 'gpt_card_oauth_next';
const loggedOutCookie = 'gpt_card_logged_out';
const localAdminCookie = 'gpt_card_local_admin';
const sessionTtlSeconds = 60 * 60 * 24 * 30;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type OAuthUserInfo = {
  sub: string;
  email: string;
  name?: string | null;
  role?: string | null;
};

export async function createOAuthRequest(origin: string) {
  const state = createSignedOAuthState();
  const redirectUri = oauthRedirectUri(origin);
  const cookieStore = await cookies();

  cookieStore.set(oauthStateCookie, state, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 10 * 60,
    path: '/'
  });

  return {
    clientId: oauthClientId(),
    parentOrigin: oauthIssuerOrigin(),
    redirectUri,
    scope: 'openid email profile',
    state
  };
}

export async function createLoginRedirectUrl(
  origin: string,
  promptNone = true
) {
  const oauthRequest = await createOAuthRequest(origin);

  const url = new URL(oauthAuthorizeUrl());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', oauthRequest.clientId);
  url.searchParams.set('redirect_uri', oauthRequest.redirectUri);
  url.searchParams.set('scope', oauthRequest.scope);
  url.searchParams.set('state', oauthRequest.state);

  if (promptNone) {
    url.searchParams.set('prompt', 'none');
  }

  return url;
}

export async function handleOAuthCallback({
  code,
  origin,
  state
}: {
  code: string;
  origin: string;
  state: string;
}) {
  await verifyOAuthState(state);
  const accessToken = await exchangeCodeForAccessToken(code, origin);
  const userInfo = await fetchUserInfo(accessToken);
  const user = await saveOAuthUser(userInfo);

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();

  if (isLocalAuthMode()) {
    if (cookieStore.get(localAdminCookie)?.value !== '1') {
      return null;
    }

    return localAdminUser();
  }

  const token = cookieStore.get(sessionCookie)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token)
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      }
    }
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AppError('unauthorized', 'Sign in is required', 401);
  }

  if (user.role !== 'admin') {
    throw new AppError('forbidden', 'Admin access is required', 403);
  }

  return user;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(token)
      }
    });
  }

  cookieStore.delete(sessionCookie);
  cookieStore.delete(localAdminCookie);

  if (isLocalAuthMode()) {
    cookieStore.set(loggedOutCookie, '1', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/'
    });
  }
}

export async function clearManualLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(loggedOutCookie);
}

export async function rememberOAuthNextPath(nextPath: string) {
  const cookieStore = await cookies();

  cookieStore.set(oauthNextCookie, nextPath, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 10 * 60,
    path: '/'
  });
}

export async function consumeOAuthNextPath() {
  const cookieStore = await cookies();
  const nextPath = safeNextPath(cookieStore.get(oauthNextCookie)?.value);

  cookieStore.delete(oauthNextCookie);

  return nextPath;
}

export async function createLocalAdminSession() {
  if (!isLocalAuthMode()) {
    throw new AppError('invalid_auth_mode', 'Local auth is not enabled', 400);
  }

  const cookieStore = await cookies();
  cookieStore.set(localAdminCookie, '1', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: sessionTtlSeconds,
    path: '/'
  });
  cookieStore.delete(loggedOutCookie);
}

async function saveOAuthUser(userInfo: OAuthUserInfo) {
  const payload = {
    email: userInfo.email,
    name: userInfo.name ?? null,
    role: userInfo.role === 'admin' ? 'admin' : 'viewer'
  };

  try {
    return await prisma.user.upsert({
      where: {
        id: userInfo.sub
      },
      update: payload,
      create: {
        id: userInfo.sub,
        ...payload
      }
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    logWarn('auth.oauth_user.unique_collision', {
      email: userInfo.email,
      provider: 'os7',
      userId: userInfo.sub
    });

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: userInfo.sub }, { email: userInfo.email }]
      },
      select: {
        id: true
      }
    });

    if (!existingUser) {
      throw error;
    }

    return prisma.user.update({
      where: {
        id: existingUser.id
      },
      data: payload
    });
  }
}

async function createSession(user: CurrentUser) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: sessionTtlSeconds,
    path: '/'
  });
  cookieStore.delete(loggedOutCookie);
}

function createSignedOAuthState() {
  const nonce = randomBytes(18).toString('base64url');
  const signature = signState(nonce);
  return `${nonce}.${signature}`;
}

async function verifyOAuthState(state: string) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(oauthStateCookie)?.value;
  cookieStore.delete(oauthStateCookie);

  if (!expectedState || expectedState !== state) {
    throw new AppError('invalid_oauth_state', 'Invalid sign-in state', 400);
  }

  const [nonce, signature] = state.split('.');
  const expectedSignature = signState(nonce ?? '');

  if (
    !signature ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new AppError('invalid_oauth_state', 'Invalid sign-in state', 400);
  }
}

function signState(nonce: string) {
  return createHmac('sha256', authSecret()).update(nonce).digest('base64url');
}

function oauthRedirectUri(origin: string) {
  return `${origin}/api/auth/callback/os7`;
}

function safeNextPath(value: string | undefined) {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

async function exchangeCodeForAccessToken(code: string, origin: string) {
  const response = await fetch(oauthInternalTokenUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...os7RequestHostHeader()
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauthRedirectUri(origin),
      client_id: oauthClientId(),
      client_secret: oauthClientSecret()
    })
  });

  if (!response.ok) {
    logInfo('auth.oauth_token.failed', {
      provider: 'os7',
      status: response.status
    });
    throw new AppError('oauth_token_failed', 'Sign-in failed', 502);
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    throw new AppError('oauth_token_missing', 'Sign-in failed', 502);
  }

  return payload.access_token;
}

async function fetchUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const response = await fetch(oauthInternalUserinfoUrl(), {
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...os7RequestHostHeader()
    }
  });

  if (!response.ok) {
    throw new AppError('oauth_userinfo_failed', 'Sign-in failed', 502);
  }

  const payload = (await response.json()) as OAuthUserInfo;

  if (!payload.sub || !payload.email) {
    throw new AppError('oauth_userinfo_invalid', 'Sign-in failed', 502);
  }

  return payload;
}

function hashSessionToken(token: string) {
  return createHmac('sha256', authSecret()).update(token).digest('hex');
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export function publicOauthIssuerOrigin() {
  return oauthIssuerOrigin();
}
