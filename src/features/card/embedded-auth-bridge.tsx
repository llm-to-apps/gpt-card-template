'use client';

import { useEffect } from 'react';

type OAuthBridgeRequest = {
  clientId: string;
  nextPath: string;
  parentOrigin: string;
  redirectUri: string;
  scope: string;
  state: string;
};

type AuthBridgePayload =
  | {
      ok: true;
      data: {
        authenticated: true;
      };
    }
  | {
      ok: true;
      data: {
        authenticated: false;
        localLoginUrl?: string;
        oauthRequest?: OAuthBridgeRequest;
      };
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

export function EmbeddedAuthBridge({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || window.parent === window) {
      return;
    }

    let isDone = false;
    let retryInterval = 0;
    const controller = new AbortController();

    async function startBridge() {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      const response = await fetch(
        `/api/auth/bridge?next=${encodeURIComponent(nextPath)}`,
        {
          cache: 'no-store',
          signal: controller.signal
        }
      );
      const payload = (await response.json()) as AuthBridgePayload;

      if (!payload.ok || payload.data.authenticated) {
        return;
      }

      if (payload.data.localLoginUrl) {
        window.location.replace(payload.data.localLoginUrl);
        return;
      }

      if (!payload.data.oauthRequest) {
        return;
      }

      const oauthRequest = payload.data.oauthRequest;
      const timeout = window.setTimeout(() => {
        isDone = true;
        window.clearInterval(retryInterval);
      }, 15_000);

      window.addEventListener('message', (event) => {
        if (
          isDone ||
          event.origin !== oauthRequest.parentOrigin ||
          event.data?.state !== oauthRequest.state
        ) {
          return;
        }

        if (event.data.type === 'oauth:response' && event.data.code) {
          isDone = true;
          window.clearTimeout(timeout);
          window.clearInterval(retryInterval);

          const callbackUrl = new URL(oauthRequest.redirectUri);
          callbackUrl.searchParams.set('code', event.data.code);
          callbackUrl.searchParams.set('state', oauthRequest.state);
          window.location.replace(callbackUrl.toString());
        }

        if (event.data.type === 'oauth:error') {
          isDone = true;
          window.clearTimeout(timeout);
          window.clearInterval(retryInterval);
        }
      });

      function postOAuthRequest() {
        if (isDone) {
          return;
        }

        window.parent.postMessage(
          {
            type: 'oauth:request',
            clientId: oauthRequest.clientId,
            redirectUri: oauthRequest.redirectUri,
            scope: oauthRequest.scope,
            state: oauthRequest.state
          },
          oauthRequest.parentOrigin
        );
      }

      postOAuthRequest();
      retryInterval = window.setInterval(postOAuthRequest, 500);
    }

    void startBridge().catch(() => null);

    return () => {
      isDone = true;
      window.clearInterval(retryInterval);
      controller.abort();
    };
  }, [enabled]);

  return null;
}
