// Loads Facebook JS SDK and provides a Promise-based FB.login wrapper for
// Embedded Signup ("Facebook Login for Business" with config_id).

let sdkPromise = null;

export function loadFbSdk(appId, version = 'v23.0') {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version,
      });
      resolve(window.FB);
    };
    const id = 'facebook-jssdk';
    if (document.getElementById(id)) return;
    const js = document.createElement('script');
    js.id = id;
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    js.async = true;
    js.defer = true;
    document.body.appendChild(js);
  });
  return sdkPromise;
}

export function launchEmbeddedSignup(configId, sessionInfoCb) {
  return new Promise((resolve, reject) => {
    if (!window.FB) return reject(new Error('FB SDK not ready'));

    // Listen for embedded-signup session events (business_id, waba_id, phone_number_id)
    const messageHandler = (event) => {
      if (!event.origin.includes('facebook.com')) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') sessionInfoCb?.(data);
      } catch (_) {}
    };
    window.addEventListener('message', messageHandler);

    window.FB.login(
      (response) => {
        window.removeEventListener('message', messageHandler);
        if (response.authResponse && response.authResponse.code) {
          resolve({ code: response.authResponse.code });
        } else {
          reject(new Error(response.status || 'login_cancelled'));
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', version: 2 },
      }
    );
  });
}
