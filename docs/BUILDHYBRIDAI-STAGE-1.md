# BuildHybridAI 2026 — Stage 1 Hybrid Inference Proof

Status: isolated Firebase AI Logic proof implementation committed to the preparation branch; CI validation and live Firebase request are pending.

## Verified repository baseline

- Repository: `thisishaidee/kivora`
- Base branch: `main`
- Baseline commit inspected: current `main` at audit time
- Existing frontend: React 19 + Vite 6 + TypeScript
- Existing backend: Cloudflare Worker + D1
- Existing AI adapter: Cloudflare Workers AI in `shared/src/response-runtime.js` and `worker/src/runtime.js`
- Firebase JS SDK `12.14.0` is now pinned in root `package.json` (includes `initializeDeviceModel()` and the `inferenceSource` API)
- An isolated `FirebaseHybridProof` component now initializes Firebase AI Logic and reCAPTCHA Enterprise App Check
- Existing Worker AI is configured with `AI_ENABLED: false`; preserve this configuration during the proof.

## Stage 1 objective

Build a small, isolated Firebase AI Logic test surface before connecting Firebase inference to KIVORA's existing assistant workflow.

The proof must demonstrate a genuine Firebase AI Logic response, report the actual `inferenceSource`, and keep the existing Cloudflare Worker, evidence, safety, identity, session, and response-validation paths unchanged.

## Environment facts and constraints

- The owner is currently developing from Android and has no desktop Chrome test device available.
- Firebase AI Logic web on-device inference requires desktop Chrome 139+ and the Chrome Prompt API. Android Chrome cannot prove the local web inference path.
- Android can be used to validate the cloud inference path in the web app, subject to Firebase project setup, network access, and App Check configuration.
- Firebase project: `kivora-c888a`; Gemini Developer API is enabled; the KIVORA Web app is registered.
- Do not claim Gemini Nano local execution until a supported desktop Chrome test returns `ON_DEVICE`.
- Do not claim a specific Gemini Nano version is pinned by the web SDK; the browser-managed Prompt API model is device/browser controlled.

## External Firebase setup required

1. Open https://console.firebase.google.com/ and inspect the project picker for an existing KIVORA project.
2. If none exists, create a Firebase project named KIVORA (or add Firebase to an existing approved Google Cloud project).
3. In Firebase Console, open AI Services → AI Logic and complete the setup using the Gemini Developer API initially, unless project constraints require another provider.
4. Register a Firebase Web App for the existing Vite frontend.
5. Copy the web app's Firebase configuration into local/deployment environment variables. Never commit private service-account credentials, API keys intended to remain secret, or App Check debug tokens.
6. Configure Firebase App Check for the registered web app using a production web attestation provider (reCAPTCHA Enterprise is the recommended new web integration in Firebase documentation). Keep debug tokens out of source control.
7. Add the production deployment hostname(s) to the App Check provider configuration.

Official guides:
- https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider

## Implementation progress and remaining sequence

Completed in the branch:

1. Added the Firebase JS SDK dependency (`13.0.0`).
2. Added an isolated hybrid inference proof panel to the existing React app.
3. Configured the panel for `PREFER_ON_DEVICE` and an explicit `gemini-3.5-flash-lite` cloud fallback.
4. Added user-gesture-triggered `initializeDeviceModel()` and visible reporting of the SDK's `inferenceSource`.
5. Added environment-variable placeholders in `.env.example`; no live Firebase values or secret credentials were committed.
6. Updated CI to run on this branch and refresh/commit the lockfile before dependency installation.

Remaining:

- Add the Firebase web configuration and the public reCAPTCHA Enterprise site key to Cloudflare Pages environment variables.
- Register the generated site key in Firebase App Check for the KIVORA Web app.
- Wait for CI, fix any type/build/test issues, then deploy the preview and run a real cloud request from Android.
- Verify `ON_DEVICE` on supported desktop Chrome 139+ later; Android cannot prove local inference.

## Implementation sequence after project identification

1. Add the Firebase JS SDK using the repository's package manager and update the lockfile in the same change.
2. Add a dedicated Firebase client module, initialized only when the required public Firebase web configuration is present.
3. Add an isolated development/test page or route, not a replacement for the production assistant.
4. Initialize Firebase AI Logic using the documented `firebase/ai` API and configure `InferenceMode.PREFER_ON_DEVICE` with an explicit supported cloud fallback model.
5. Call `initializeDeviceModel()` only from a user gesture. Do not block the cloud test on local model download.
6. Send a short, single-turn text prompt and display the generated response plus the SDK-provided `inferenceSource`.
7. Add safe handling for missing configuration, App Check failures, unsupported browser/device, model download, network failure, and quota errors.
8. Keep KIVORA's existing safety/evidence validation outside and after model generation when integration begins.
9. Run typecheck, unit tests, build, and GitHub Actions. Do not merge this branch into `main` until the proof and regression checks pass.

## Acceptance criteria

### Cloud proof — can be tested from Android

- Firebase project and web app are configured.
- Firebase AI Logic request succeeds through the configured cloud provider.
- The result contains a genuine generated response.
- `result.response.inferenceSource` reports `IN_CLOUD`.
- App Check is configured and the request is accepted.
- No existing KIVORA production path has been changed.

### Local proof — requires desktop Chrome

- Chrome Desktop 139+ with the Prompt API enabled and the on-device model available.
- User-triggered device model initialization completes.
- A supported single-turn text prompt returns a genuine response.
- `result.response.inferenceSource` reports `ON_DEVICE`.

### Fallback proof

- On a browser/device where local inference is unavailable, `PREFER_ON_DEVICE` successfully returns a cloud response.
- The reported source is `IN_CLOUD`.
- The UI does not mislabel cloud inference as local inference.

## Explicit non-goals for Stage 1

- No replacement of the Cloudflare Worker.
- No migration of the existing assistant.
- No change to the existing `AI_ENABLED` setting.
- No full multi-trade knowledge base.
- No production deployment.
- No mock response presented as Firebase inference.
- No claim of local inference until `ON_DEVICE` has been observed on supported hardware.
