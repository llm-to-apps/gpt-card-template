import 'server-only';

type OAuthBridgeRequest = {
  clientId: string;
  nextPath: string;
  parentOrigin: string;
  redirectUri: string;
  scope: string;
  state: string;
};

export function renderOAuthLoginPage(oauthRequest: OAuthBridgeRequest) {
  const payload = JSON.stringify(oauthRequest).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signing in</title>
    <style>
      :root { color-scheme: light; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background: #f7f7f5;
        color: #151515;
        font-family: Arial, Helvetica, sans-serif;
      }
      main {
        display: grid;
        justify-items: center;
        gap: 14px;
        padding: 28px;
        text-align: center;
      }
      h1 {
        margin: 0;
        font-size: 18px;
        letter-spacing: 0;
      }
      p {
        max-width: 320px;
        margin: 0;
        color: #6f7378;
        font-size: 14px;
        line-height: 1.45;
      }
      .mark {
        width: 34px;
        height: 34px;
        border: 1px solid #d6d7da;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #151515;
        font-size: 14px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">G</div>
      <h1 id="status">Checking your OS7 session...</h1>
      <p id="detail">GPT Card is asking OS7 for a secure sign-in response.</p>
    </main>
    <script>
      const oauthRequest = ${payload};
      const status = document.getElementById('status');
      const detail = document.getElementById('detail');
      const nextQuery = new URLSearchParams({ next: oauthRequest.nextPath });
      const interactiveLoginUrl = '/api/auth/login?interactive=1&' + nextQuery.toString();
      let detailTimer = 0;

      function setMessage(nextStatus, nextDetail) {
        status.textContent = nextStatus;
        detail.textContent = nextDetail;
      }

      detailTimer = window.setTimeout(() => {
        setMessage(
          'Still waiting for OS7...',
          'If your session needs attention, GPT Card will open the OS7 sign-in screen.'
        );
      }, 2500);

      if (window.parent === window) {
        window.location.replace('/api/auth/login?' + nextQuery.toString());
      } else {
        let isDone = false;
        let retryInterval = 0;
        const timeout = window.setTimeout(() => {
          isDone = true;
          window.clearTimeout(detailTimer);
          window.clearInterval(retryInterval);
          setMessage(
            'Opening OS7 sign-in...',
            'The automatic session check took too long, so GPT Card is switching to the interactive sign-in flow.'
          );
          window.location.replace(interactiveLoginUrl);
        }, 15000);

        window.addEventListener('message', (event) => {
          if (event.origin !== oauthRequest.parentOrigin || event.data?.state !== oauthRequest.state) {
            return;
          }

          if (event.data.type === 'oauth:response' && event.data.code) {
            isDone = true;
            window.clearTimeout(timeout);
            window.clearTimeout(detailTimer);
            window.clearInterval(retryInterval);
            setMessage(
              'Finishing sign-in...',
              'GPT Card received your OS7 response and is exchanging it for an app session.'
            );
            const callbackUrl = new URL(oauthRequest.redirectUri);
            callbackUrl.searchParams.set('code', event.data.code);
            callbackUrl.searchParams.set('state', oauthRequest.state);
            window.location.replace(callbackUrl.toString());
            return;
          }

          if (event.data.type === 'oauth:error') {
            isDone = true;
            window.clearTimeout(timeout);
            window.clearTimeout(detailTimer);
            window.clearInterval(retryInterval);
            setMessage(
              event.data.message || 'Opening OS7 sign-in...',
              'GPT Card could not complete the embedded check, so it is switching to the full sign-in screen.'
            );
            window.location.replace(interactiveLoginUrl);
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
    </script>
  </body>
</html>`;
}
