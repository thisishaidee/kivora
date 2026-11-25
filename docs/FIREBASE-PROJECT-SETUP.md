# KIVORA — Firebase Project Setup Checklist

This guide is for the owner to complete in Firebase Console. Do not commit credentials, service-account JSON, App Check debug tokens, or private API secrets to GitHub.

## 1. Create the Firebase project

1. Open https://console.firebase.google.com/
2. Select **Add project**.
3. Use the project name **KIVORA**.
4. Google Analytics is not required for Firebase AI Logic. Leave it disabled unless there is a separate product need.
5. Complete project creation and note the Firebase project ID.

Use the project ID in deployment notes; do not put private credentials in the repository.

## 2. Enable Firebase AI Logic

1. In the new project, open **AI Services → AI Logic**.
2. Select **Get started**.
3. Choose **Gemini Developer API** for the initial proof. This is the simplest starting provider and avoids requiring a billing-linked Vertex AI setup for the first test.
4. Complete the guided API setup.
5. Confirm that Firebase AI Logic appears as enabled and that App Check enforcement is on.

Do not paste a Gemini API key into the application. Firebase AI Logic routes client requests through its managed proxy; the provider key should remain managed by Google/Firebase.

## 3. Register the existing KIVORA web app

1. In Project settings → General → Your apps, add a **Web app**.
2. Give it the nickname **KIVORA Web**.
3. Do not add Firebase Hosting; KIVORA's existing deployment remains on Cloudflare.
4. Copy the Firebase web app configuration fields: apiKey, authDomain, projectId, appId, messagingSenderId (if present), and storageBucket (if present).
5. Treat these as Firebase web-app configuration, not as a service-account credential. Still keep environment-specific configuration out of committed source so deployments can be configured safely.

## 4. Configure App Check

Firebase AI Logic setup enforces App Check. Do not disable enforcement to make the demo work.

For development:
- Use the Firebase App Check debug provider only in a local/development build.
- Register the debug token in Firebase Console when prompted.
- Never commit the debug token or expose it in screenshots or public logs.

For the deployed web app:
1. Create a reCAPTCHA Enterprise web key for the exact KIVORA production hostname.
2. Do not add localhost to a production reCAPTCHA key.
3. In Firebase Console → Security → App Check → Apps, register KIVORA Web with reCAPTCHA Enterprise.
4. Confirm the Firebase AI Logic API is enforced and review App Check metrics after testing.

The reCAPTCHA Enterprise provider is invisible to users; it should not require a checkbox challenge. Review current Google pricing/quotas before enabling billing or changing plans.

## 5. Values to provide for repository configuration

After setup, provide only the following non-secret web configuration values through the approved deployment environment-variable interface:
- Firebase project ID
- Firebase web app ID
- Firebase auth domain
- Firebase API key (web-app config value)
- Firebase messaging sender ID, if supplied
- Firebase storage bucket, if supplied
- reCAPTCHA Enterprise site key (site key, never the secret key)

Never provide:
- Google service-account JSON/private key
- Gemini Developer API key
- reCAPTCHA Enterprise secret key
- Firebase App Check debug token

The repository implementation will read public Firebase web configuration from Vite environment variables. Do not create a committed .env file containing live values.

## 6. Report back

Once setup is complete, report:
- Firebase project ID
- Whether AI Logic setup completed
- Whether KIVORA Web was registered
- Whether App Check is registered for the web app
- Production hostname(s) where KIVORA will run

Do not share passwords, private keys, debug tokens, or secret API credentials in chat.
