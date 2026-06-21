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

export function os7RequestHostHeader(): Record<string, string> {
  return process.env.OAUTH_REQUEST_HOST
    ? { host: process.env.OAUTH_REQUEST_HOST }
    : {};
}

export function devMcpToken() {
  return process.env.GPT_CARD_DEV_MCP_TOKEN || '';
}

export function projectId() {
  return requiredEnv('PROJECT_ID');
}

export function projectTokenIntrospectionUrl() {
  return requiredEnv('OS7_PROJECT_TOKEN_INTROSPECTION_URL');
}

export function storageBackend() {
  const backend = process.env.GPT_CARD_STORAGE_BACKEND ?? 'disk';

  if (backend !== 'disk' && backend !== 's3') {
    throw new Error(`Unsupported GPT_CARD_STORAGE_BACKEND: ${backend}`);
  }

  return backend;
}

export function s3Endpoint() {
  return requiredEnv('S3_ENDPOINT');
}

export function s3Region() {
  return requiredEnv('S3_REGION');
}

export function s3AccessKeyId() {
  return requiredEnv('S3_ACCESS_KEY_ID');
}

export function s3SecretAccessKey() {
  return requiredEnv('S3_SECRET_ACCESS_KEY');
}

export function s3Bucket() {
  return requiredEnv('S3_BUCKET');
}

export function s3ForcePathStyle() {
  return process.env.S3_FORCE_PATH_STYLE !== 'false';
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
