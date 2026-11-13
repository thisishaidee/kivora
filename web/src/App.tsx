import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  languageSchema,
  tradeSchema,
  unitSystemSchema,
  type Language,
  type Trade,
  type UnitSystem,
} from "../../shared/src/contracts";

type IdentityState = "checking" | "welcome" | "recovery" | "recovery-code" | "ready";
type WorkSession = {
  id: string;
  title: string;
  trade: Trade;
  language: Language;
  unit_system: UnitSystem;
  created_at: number;
  updated_at: number;
  archived_at: number | null;
};
type WorkMessage = { id: string; role: string; content: string; created_at: number };

const trades: { value: Trade; label: string }[] = [
  { value: "carpentry", label: "Carpentry & furniture" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC & refrigeration" },
  { value: "mechanical", label: "Mechanical & equipment repair" },
  { value: "construction", label: "Construction & installation" },
  { value: "multiple", label: "More than one trade" },
  { value: "unsure", label: "Not sure yet" },
];
const languages: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "en-ng", label: "Nigerian English" },
  { value: "pcm-ng", label: "Nigerian Pidgin" },
  { value: "fr", label: "French" },
];

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "request_failed");
  return body as T;
}

export default function App() {
  const [identityState, setIdentityState] = useState<IdentityState>("checking");
  const [workerId, setWorkerId] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trade, setTrade] = useState<Trade>("carpentry");
  const [language, setLanguage] = useState<Language>("en");
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [task, setTask] = useState("");
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [messages, setMessages] = useState<WorkMessage[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  async function refreshSessions() {
    const result = await api<{ sessions: WorkSession[] }>("/api/work-sessions");
    setSessions(result.sessions);
  }

  useEffect(() => {
    let alive = true;
    void api<{ worker: { id: string } }>("/api/identity")
      .then(async (result) => {
        if (!alive) return;
        setWorkerId(result.worker.id);
        setIdentityState("ready");
        try {
          const list = await api<{ sessions: WorkSession[] }>("/api/work-sessions");
          if (alive) setSessions(list.sessions);
        } catch {
          if (alive) setNotice("Your private workspace could not be loaded. Refresh to retry.");
        }
      })
      .catch(() => {
        if (alive) setIdentityState("welcome");
      });
    return () => { alive = false; };
  }, []);

  async function createIdentity() {
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ worker: { id: string }; recovery_code: string }>("/api/identity", { method: "POST" });
      setWorkerId(result.worker.id);
      setRecoveryCode(result.recovery_code);
      setRecoverySaved(false);
      setCopied(false);
      setIdentityState("recovery-code");
    } catch {
      setNotice("We couldn't create your private workspace. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ worker: { id: string }; recovery_code: string }>("/api/identity/recover", {
        method: "POST",
        body: JSON.stringify({ recovery_code: recoveryInput.trim() }),
      });
      setWorkerId(result.worker.id);
      setRecoveryCode(result.recovery_code);
      setRecoveryInput("");
      setRecoverySaved(false);
      setCopied(false);
      setIdentityState("recovery-code");
    } catch {
      setNotice("That recovery code could not be used. Check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function rotateRecoveryCode() {
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ recovery_code: string }>("/api/identity/recovery/rotate", { method: "POST" });
      setRecoveryCode(result.recovery_code);
      setRecoverySaved(false);
      setCopied(false);
      setIdentityState("recovery-code");
    } catch {
      setNotice("A new recovery code could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function copyRecoveryCode() {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setNotice("Recovery code copied. Store it somewhere private.");
    } catch {
      setNotice("Clipboard access is unavailable. Select and copy the code manually.");
    }
  }

  async function finishRecoverySetup() {
    if (!recoverySaved) return;
    setRecoveryCode("");
    setIdentityState("ready");
    setNotice("Your private workspace is ready.");
    try {
      await refreshSessions();
    } catch {
      setNotice("Your workspace is ready, but the session list could not be loaded.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validTrade = tradeSchema.safeParse(trade);
    const validLanguage = languageSchema.safeParse(language);
    const validUnits = unitSystemSchema.safeParse(units);
    if (!validTrade.success || !validLanguage.success || !validUnits.success || !task.trim()) {
      setNotice("Add a job description and check your preferences.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ session: WorkSession }>("/api/work-sessions", {
        method: "POST",
        body: JSON.stringify({
          trade: validTrade.data,
          language: validLanguage.data,
          units: validUnits.data,
          task: task.trim(),
        }),
      });
      setTask("");
      setActiveSession(result.session);
      setMessages([{
        id: "initial-task",
        role: "worker",
        content: task.trim(),
        created_at: result.session.created_at,
      }]);
      await refreshSessions();
      setNotice("Your task is saved in your private workspace. Guided AI assistance is the next build stage.");
    } catch {
      setNotice("Your task could not be saved. It has not been sent to an AI service.");
    } finally {
      setBusy(false);
    }
  }

  async function openSession(id: string) {
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ session: WorkSession; messages: WorkMessage[] }>(`/api/work-sessions/${id}`);
      setActiveSession(result.session);
      setMessages(result.messages);
    } catch {
      setNotice("That work session could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSession(session: WorkSession) {
    setBusy(true);
    try {
      await api(`/api/work-sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !session.archived_at }),
      });
      await refreshSessions();
      if (activeSession?.id === session.id) {
        setActiveSession({ ...session, archived_at: session.archived_at ? null : Math.floor(Date.now() / 1000) });
      }
      setNotice(session.archived_at ? "Work session restored." : "Work session archived.");
    } catch {
      setNotice("The work session could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSession(session: WorkSession) {
    if (!window.confirm("Permanently delete this work session and its messages?")) return;
    setBusy(true);
    try {
      await api(`/api/work-sessions/${session.id}`, { method: "DELETE" });
      await refreshSessions();
      if (activeSession?.id === session.id) {
        setActiveSession(null);
        setMessages([]);
      }
      setNotice("Work session deleted.");
    } catch {
      setNotice("The work session could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await api("/api/identity/logout", { method: "POST" });
      setWorkerId("");
      setSessions([]);
      setActiveSession(null);
      setMessages([]);
      setIdentityState("welcome");
      setNotice("You have been logged out. Your private workspace remains available with your recovery code.");
    } catch {
      setNotice("You could not be logged out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteIdentity() {
    if (!window.confirm("Delete your KIVORA identity and all private work sessions? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api("/api/identity", { method: "DELETE" });
      setWorkerId("");
      setSessions([]);
      setActiveSession(null);
      setMessages([]);
      setIdentityState("welcome");
      setNotice("Your private workspace has been deleted.");
    } catch {
      setNotice("Your workspace could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const visibleSessions = sessions.filter((session) => showArchived || !session.archived_at);

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="KIVORA home">
          <span className="brand-mark">K</span>
          <span>KIVORA</span>
        </a>
        <span className="topbar-note">Practical intelligence for skilled work</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR WORK. YOUR NEXT MOVE.</p>
        <h1>Know what<br /><em>to do next.</em></h1>
        <p className="intro">Get clearer on unfamiliar products, materials, equipment and problems. Start with the job in front of you.</p>
      </section>

      {identityState === "checking" && (
        <section className="workspace identity-card">
          <p className="eyebrow">PRIVATE WORKSPACE</p>
          <h2>Opening your workspace…</h2>
          <p className="privacy-note">Checking your private worker session.</p>
        </section>
      )}

      {identityState === "welcome" && (
        <section className="workspace identity-card">
          <p className="eyebrow">PRIVATE BY DEFAULT</p>
          <h2>Start your own workspace.</h2>
          <p className="intro compact-intro">Your work sessions belong to you. Create an anonymous worker identity or restore one with its recovery code. No email or wallet is required.</p>
          <button className="submit-button" type="button" onClick={() => void createIdentity()} disabled={busy}>
            {busy ? "Creating…" : "Create private workspace"} <span aria-hidden="true">↗</span>
          </button>
          <button className="secondary-action" type="button" onClick={() => { setIdentityState("recovery"); setNotice(""); }}>
            Restore an existing workspace
          </button>
          {notice && <p className="notice" role="status">{notice}</p>}
        </section>
      )}

      {identityState === "recovery" && (
        <section className="workspace identity-card">
          <p className="eyebrow">RESTORE ACCESS</p>
          <h2>Enter your recovery code.</h2>
          <form onSubmit={(event) => void restoreIdentity(event)}>
            <label className="field">
              <span>64-character recovery code</span>
              <textarea value={recoveryInput} onChange={(event) => setRecoveryInput(event.target.value)} rows={3} autoComplete="off" spellCheck={false} placeholder="Paste your saved recovery code" />
            </label>
            <button className="submit-button" type="submit" disabled={busy || !recoveryInput.trim()}>
              {busy ? "Restoring…" : "Restore workspace"} <span aria-hidden="true">↗</span>
            </button>
          </form>
          <button className="secondary-action" type="button" onClick={() => { setIdentityState("welcome"); setNotice(""); }}>Back</button>
          {notice && <p className="notice" role="status">{notice}</p>}
        </section>
      )}

      {identityState === "recovery-code" && (
        <section className="workspace identity-card">
          <p className="eyebrow">SAVE THIS ONCE</p>
          <h2>Your recovery code.</h2>
          <p className="wallet-copy">This is the only way to restore this anonymous workspace on another device. KIVORA stores only a hash. If you lose this code and your current browser session, your workspace cannot be recovered.</p>
          <div className="recovery-code">{recoveryCode}</div>
          <button className="unit-option selected" type="button" onClick={() => void copyRecoveryCode()}>{copied ? "Copied" : "Copy recovery code"}</button>
          <label className="recovery-confirm">
            <input type="checkbox" checked={recoverySaved} onChange={(event) => setRecoverySaved(event.target.checked)} />
            <span>I have saved this code somewhere private and can retrieve it later.</span>
          </label>
          <button className="submit-button" type="button" onClick={() => void finishRecoverySetup()} disabled={!recoverySaved}>
            Continue to workspace <span aria-hidden="true">↗</span>
          </button>
          {notice && <p className="notice" role="status">{notice}</p>}
        </section>
      )}

      {identityState === "ready" && (
        <>
          <section className="workspace" aria-labelledby="start-title">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">WORKSPACE</p>
                <h2 id="start-title">What are you working on?</h2>
              </div>
              <span className="step-label">01 / START</span>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)}>
              <div className="field-grid">
                <label className="field">
                  <span>Your trade</span>
                  <select value={trade} onChange={(event) => setTrade(event.target.value as Trade)}>
                    {trades.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Language</span>
                  <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                    {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>

              <fieldset className="units-field">
                <legend>Measurement units</legend>
                <div className="unit-options">
                  <button type="button" className={units === "metric" ? "unit-option selected" : "unit-option"} onClick={() => setUnits("metric")}>Metric · mm, cm, m</button>
                  <button type="button" className={units === "imperial" ? "unit-option selected" : "unit-option"} onClick={() => setUnits("imperial")}>Imperial · in, ft</button>
                </div>
              </fieldset>

              <label className="field task-field">
                <span>Describe the job, product or problem</span>
                <textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="What are you trying to do? What have you noticed? Include a product or model number if you have one." rows={5} />
              </label>

              <button className="submit-button" type="submit" disabled={busy || !task.trim()}>
                {busy ? "Saving…" : "Save work session"} <span aria-hidden="true">↗</span>
              </button>
              <p className="privacy-note">Your task is stored in your private workspace. Avoid passwords, access codes and customer personal details. AI guidance is not connected yet.</p>
            </form>
          </section>

          <section className="workspace session-library">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">YOUR PRIVATE HISTORY</p>
                <h2>Work sessions</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setShowArchived((value) => !value)}>
                {showArchived ? "Hide archived" : "Show archived"}
              </button>
            </div>
            {visibleSessions.length === 0 ? (
              <p className="privacy-note">Your saved work sessions will appear here.</p>
            ) : (
              <div className="session-list">
                {visibleSessions.map((session) => (
                  <article className={activeSession?.id === session.id ? "session-item active" : "session-item"} key={session.id}>
                    <button className="session-open" type="button" onClick={() => void openSession(session.id)}>
                      <span className="session-title">{session.title}</span>
                      <span className="session-meta">{trades.find((item) => item.value === session.trade)?.label ?? session.trade} · {new Date(session.updated_at * 1000).toLocaleDateString()}</span>
                    </button>
                    <div className="session-actions">
                      <button className="text-button" type="button" onClick={() => void archiveSession(session)}>{session.archived_at ? "Restore" : "Archive"}</button>
                      <button className="text-button danger-text" type="button" onClick={() => void deleteSession(session)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {activeSession && (
            <section className="workspace active-session">
              <div className="workspace-heading">
                <div>
                  <p className="eyebrow">SAVED WORK SESSION</p>
                  <h2>{activeSession.title}</h2>
                </div>
                <button className="text-button" type="button" onClick={() => { setActiveSession(null); setMessages([]); }}>Close</button>
              </div>
              <div className="message-list">
                {messages.map((message) => (
                  <article className="message-card" key={message.id}>
                    <span className="message-role">{message.role === "worker" ? "YOU" : message.role.toUpperCase()}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
              <p className="privacy-note">This is your saved task history. KIVORA's evidence-backed AI response workflow is still being built.</p>
            </section>
          )}

          <section className="workspace account-card">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">ACCOUNT & RECOVERY</p>
                <h2>Your private identity</h2>
              </div>
              <span className="step-label">ACTIVE</span>
            </div>
            <p className="privacy-note">Anonymous worker ID: {workerId.slice(0, 8)}…{workerId.slice(-4)}. Your sessions are not shared with other workers.</p>
            <div className="account-actions">
              <button className="unit-option" type="button" onClick={() => void rotateRecoveryCode()} disabled={busy}>Generate new recovery code</button>
              <button className="unit-option" type="button" onClick={() => void logout()} disabled={busy}>Log out on this device</button>
              <button className="unit-option danger-option" type="button" onClick={() => void deleteIdentity()} disabled={busy}>Delete identity and all data</button>
            </div>
          </section>
        </>
      )}

      {notice && identityState === "ready" && <p className="notice global-notice" role="status">{notice}</p>}

      <footer className="footer">
        <span>KIVORA</span>
        <span>Built for the people who make things work.</span>
      </footer>
    </main>
  );
}
