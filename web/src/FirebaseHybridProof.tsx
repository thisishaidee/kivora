import { useState } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
};
const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ?? "";
const hasFirebaseConfig = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let appCheckInitialized = false;

function initializeFirebaseServices() {
  if (!hasFirebaseConfig) throw new Error("firebase_config_missing");
  const app = getApps().length ? getApp() : initializeApp(config);
  if (!siteKey) throw new Error("app_check_site_key_missing");
  if (!appCheckInitialized) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  }
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: "gemini-3.5-flash-lite",
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    },
  });
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
      const model = initializeFirebaseServices();

      // Chrome's Prompt API is available only in supported desktop Chrome.
      // On other browsers/devices, PREFER_ON_DEVICE safely falls back to cloud.
      if (typeof window !== "undefined" && "LanguageModel" in window) {
        void model.initializeDeviceModel((value) => {
          setProgress(`Preparing on-device model: ${Math.round(value * 100)}%`);
        }).catch(() => {
          setProgress("On-device model unavailable here; attempting cloud fallback.");
        });
      } else {
        setProgress("This browser does not expose Chrome's desktop Prompt API; testing cloud fallback.");
      }

      const response = await model.generateContent(
        "Reply with exactly: KIVORA Firebase AI Logic connection verified."
      );
      const source = response.response.inferenceSource;
      setResult({
        text: response.response.text(),
        source: source === "ON_DEVICE" || source === "IN_CLOUD" ? source : "UNKNOWN",
      });
      setProgress("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "unknown_error";
      if (message === "firebase_config_missing") {
        setError("Firebase web configuration is missing from the deployment environment.");
      } else if (message === "app_check_site_key_missing") {
        setError("The reCAPTCHA Enterprise site key has not been configured for this deployment yet.");
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
