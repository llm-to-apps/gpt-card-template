import 'server-only';

export function isProductionEnv() {
  return process.env.NODE_ENV === 'production';
}

export function authSecret() {
  return requiredEnv('AUTH_SECRET');
}

export function isLocalAuthMode() {
  return process.env.GPT_CARD_AUTH_MODE === 'local';
}

export function localAdminUser() {
  return {
    id: process.env.GPT_CARD_LOCAL_ADMIN_ID ?? 'local-admin',
    email: process.env.GPT_CARD_LOCAL_ADMIN_EMAIL ?? 'admin@example.local',
    name: process.env.GPT_CARD_LOCAL_ADMIN_NAME ?? 'Local Admin',
    role: 'admin'
  };
}

export function oauthClientId() {
  return requiredEnv('OAUTH_CLIENT_ID');
}

export function oauthClientSecret() {
  return requiredEnv('OAUTH_CLIENT_SECRET');
}

export function oauthIssuerOrigin() {
  return requiredEnv('OAUTH_ISSUER_URL');
}

export function oauthAuthorizeUrl() {
  return requiredEnv('OAUTH_AUTHORIZE_URL');
}

export function oauthTokenUrl() {
  return requiredEnv('OAUTH_TOKEN_URL');
}

export function oauthUserinfoUrl() {
  return requiredEnv('OAUTH_USERINFO_URL');
}

export function oauthInternalTokenUrl() {
  return process.env.OAUTH_INTERNAL_TOKEN_URL || oauthTokenUrl();
}

export function oauthInternalUserinfoUrl() {
  return process.env.OAUTH_INTERNAL_USERINFO_URL || oauthUserinfoUrl();
}

export function os7RequestHostHeader() {
  return process.env.OAUTH_REQUEST_HOST || '';
}

export function devMcpToken() {
  return process.env.GPT_CARD_DEV_MCP_TOKEN || '';
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
