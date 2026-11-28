import { useState } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from "firebase/ai";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
  storageBucket?: string;
};

type ProofResult = {
  text: string;
  source: "ON_DEVICE" | "IN_CLOUD" | "UNKNOWN";
};

const config: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCcW4L23dfKNWErHHN_Hj47Wi121xm_bRs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "kivora-c888a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "kivora-c888a",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:570419109670:web:75ad5505d0c1996654abe7",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "570419109670",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "kivora-c888a.firebasestorage.app",
};
const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ?? "6LcFUjMuAAAAAEsJeZMSU-Pf4EFlULRPv9jKkYqZ";
const hasFirebaseConfig = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let appCheckInstance: ReturnType<typeof initializeAppCheck> | null = null;

function initializeFirebaseServices() {
  if (!hasFirebaseConfig) throw new Error("firebase_config_missing");
  const app = getApps().length ? getApp() : initializeApp(config);
  if (!siteKey) throw new Error("app_check_site_key_missing");
  if (!appCheckInstance) {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  const appCheck = appCheckInstance;
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: "gemini-3.5-flash-lite",
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    },
  });
  return { app, appCheck, model };
}


function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label}_timeout_after_${ms}ms`)), ms);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function getAppCheckDiagnostics(): string {
  const recaptchaResources = performance.getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => /recaptcha|gstatic\.com\/recaptcha/i.test(url));
  const recaptchaScripts = Array.from(document.scripts)
    .map((script) => script.src)
    .filter((url) => /recaptcha/i.test(url));
  return [
    "page=" + window.location.hostname,
    "online=" + navigator.onLine,
    "recaptchaGlobal=" + ("grecaptcha" in window),
    "recaptchaScripts=" + (recaptchaScripts.length ? recaptchaScripts.join(",") : "none"),
    "recaptchaResources=" + (recaptchaResources.length ? recaptchaResources.slice(-5).join(",") : "none"),
  ].join(" | ");
}

export default function FirebaseHybridProof() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ProofResult | null>(null);
  const [error, setError] = useState("");

  const configured = hasFirebaseConfig && Boolean(siteKey);

  async function runProof() {
    setBusy(true);
    setError("");
    setResult(null);
    setProgress("");
    try {
      const { appCheck, model } = initializeFirebaseServices();
      setProgress("Checking reCAPTCHA Enterprise and Firebase App Check…");
      try {
        const tokenResult = await withTimeout(getToken(appCheck, false), 20000, "app_check_token");
        if (!tokenResult.token) throw new Error("app_check_empty_token");
      } catch (appCheckCause) {
        const reason = appCheckCause instanceof Error ? appCheckCause.message : String(appCheckCause);
        throw new Error("APP_CHECK_FAILURE: " + reason + " | " + getAppCheckDiagnostics());
      }

      // Chrome's Prompt API is available only in supported desktop Chrome.
      // On other browsers/devices, PREFER_ON_DEVICE safely falls back to cloud.
      if (typeof window !== "undefined" && "LanguageModel" in window) {
        setProgress("Preparing the on-device model. The first download may take several minutes.");
        await model.initializeDeviceModel((value) => {
          setProgress(`Preparing on-device model: ${Math.round(value * 100)}%`);
        });
      } else {
        setProgress("This browser does not expose Chrome's desktop Prompt API; testing cloud fallback.");
      }

      setProgress("App Check token received. Sending the Firebase AI Logic request…");
      const response = await withTimeout(model.generateContent(
        "Reply with exactly: KIVORA Firebase AI Logic connection verified."
      ), 45000, "firebase_ai_logic");
      const source = response.response.inferenceSource;
      setResult({
        text: response.response.text(),
        source: source === InferenceSource.ON_DEVICE
          ? "ON_DEVICE"
          : source === InferenceSource.IN_CLOUD
            ? "IN_CLOUD"
            : "UNKNOWN",
      });
      setProgress("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "unknown_error";
      if (message.startsWith("APP_CHECK_FAILURE:")) {
        setError("Firebase App Check failed: " + message.replace("APP_CHECK_FAILURE: ", ""));
      } else if (message === "firebase_config_missing") {
        setError("Firebase web configuration is missing from the deployment environment.");
      } else if (message === "app_check_site_key_missing") {
        setError("The reCAPTCHA Enterprise site key has not been configured for this deployment yet.");
      } else if (message.startsWith("app_check_token_timeout")) {
        setError("App Check did not return a token. " + getAppCheckDiagnostics());
      } else if (message.startsWith("firebase_ai_logic_timeout")) {
        setError("App Check succeeded, but Firebase AI Logic did not respond within 45 seconds. Check Firebase AI Logic API status, model access, and project restrictions.");
      } else {
        setError(`Firebase AI Logic request failed: ${message}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace hybrid-proof" aria-live="polite">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">BUILDHYBRIDAI 2026 · STAGE 1</p>
          <h2>Hybrid inference proof</h2>
        </div>
        <span className="step-label">FIREBASE AI LOGIC</span>
      </div>
      <p className="privacy-note">
        This isolated test verifies Firebase AI Logic without replacing KIVORA's existing evidence checks,
        safety assessment, or Cloudflare Worker assistant.
      </p>
      {!configured && (
        <p className="hybrid-warning">
          Firebase configuration and App Check site key must be added to the Cloudflare Pages environment before testing.
        </p>
      )}
      <button className="submit-button" type="button" onClick={() => void runProof()} disabled={!configured || busy}>
        {busy ? "Testing Firebase…" : "Run hybrid inference test"} <span aria-hidden="true">↗</span>
      </button>
      {progress && <p className="privacy-note">{progress}</p>}
      {error && <p className="hybrid-error" role="alert">{error}</p>}
      {result && (
        <div className="hybrid-result">
          <p className="eyebrow">VERIFIED INFERENCE SOURCE</p>
          <strong>{result.source}</strong>
          <p>{result.text}</p>
          <p className="privacy-note">
            {result.source === "ON_DEVICE"
              ? "The browser reports on-device inference for this request."
              : result.source === "IN_CLOUD"
                ? "The browser reports cloud-hosted inference for this request."
                : "The SDK did not return a recognised inference source. Do not count this as proof."}
          </p>
        </div>
      )}
    </section>
  );
}
