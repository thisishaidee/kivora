import { useEffect, useRef, useState } from "react";
import PublicHome from "./PublicHome";
import SpeechPlayback from "./SpeechPlayback";
import WalletPanel from "./WalletPanel";
import type { FormEvent } from "react";
import {
  languageSchema,
  tradeSchema,
  unitSystemSchema,
  type Language,
  type Trade,
  type UnitSystem,
} from "../../shared/src/contracts";
import type { IntelligenceAssessment } from "../../shared/src/intelligence";

type IdentityState = "checking" | "welcome" | "sign-in" | "sign-up" | "ready";
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
type AssistantResponse = {
  status: "clarify" | "escalate" | "guided" | "unavailable";
  summary: string;
  blocks: { kind: string; content: string; evidenceIds: string[] }[];
  questions: string[];
  citations: { id: string; publisher: string; title: string; sourceType?: string; sourceVersion?: string; revisionDate?: string; productMake?: string; productModels?: string[]; jurisdiction?: string; url?: string; documentId?: string; pageOrSection?: string }[];
  compatibilityStatus: "compatible" | "incompatible" | "undetermined";
  safetyLevel: "routine" | "caution" | "high-risk";
};
type ResearchSource = {
  title: string;
  url: string;
  excerpt: string;
  sourceType: string;
  reviewStatus: "unverified_lead";
  evidenceEligible: false;
};
type EvidenceSource = {
  id: string;
  trade: Trade;
  source_type: string;
  publisher: string;
  title: string;
  source_url: string | null;
  source_version?: string | null;
  revision_date?: string | null;
  jurisdiction?: string | null;
  product_make?: string | null;
  product_model?: string | null;
  page_or_section?: string | null;
  topic: string;
  rights_status: string;
  review_status: string;
  created_at: number;
};

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
  const identityCheckCancelled = useRef(false);
  const [activeScreen, setActiveScreen] = useState<"work" | "history" | "sources" | "payments" | "account">("work");
  const [workerId, setWorkerId] = useState("");
  const [trade, setTrade] = useState<Trade>("unsure");
  const [language, setLanguage] = useState<Language>("en");
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [task, setTask] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [materials, setMaterials] = useState("");
  const [availableTools, setAvailableTools] = useState("");
  const [constraints, setConstraints] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [involvesEquipment, setInvolvesEquipment] = useState(false);
  const [equipmentMake, setEquipmentMake] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [assessment, setAssessment] = useState<IntelligenceAssessment | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [evidenceSources, setEvidenceSources] = useState<EvidenceSource[]>([]);
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchNotice, setResearchNotice] = useState("");
  const [savedResearchUrls, setSavedResearchUrls] = useState<string[]>([]);
  const [evidenceType, setEvidenceType] = useState("manufacturer_manual");
  const [evidencePublisher, setEvidencePublisher] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceTopic, setEvidenceTopic] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceMake, setEvidenceMake] = useState("");
  const [evidenceModel, setEvidenceModel] = useState("");
  const [evidenceVersion, setEvidenceVersion] = useState("");
  const [evidenceRevisionDate, setEvidenceRevisionDate] = useState("");
  const [evidenceJurisdiction, setEvidenceJurisdiction] = useState("");
  const [evidenceSection, setEvidenceSection] = useState("");
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [messages, setMessages] = useState<WorkMessage[]>([]);
  const [followUpText, setFollowUpText] = useState("");
  const [verificationOutcome, setVerificationOutcome] = useState("not_tried");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationSaved, setVerificationSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");

  async function refreshSessions() {
    const result = await api<{ sessions: WorkSession[] }>("/api/work-sessions");
    setSessions(result.sessions);
  }

  async function refreshEvidenceSources() {
    const result = await api<{ sources: EvidenceSource[] }>("/api/evidence-sources");
    setEvidenceSources(result.sources);
  }

  async function saveEvidenceSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evidencePublisher.trim() || !evidenceTitle.trim() || !evidenceTopic.trim() || !evidenceNote.trim()) {
      setNotice("Add the source publisher, title, topic and your evidence note.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await api("/api/evidence-sources", {
        method: "POST",
        body: JSON.stringify({
          trade,
          sourceType: evidenceType,
          publisher: evidencePublisher.trim(),
          title: evidenceTitle.trim(),
          sourceUrl: evidenceUrl.trim() || undefined,
          productMake: evidenceMake.trim() || undefined,
          productModel: evidenceModel.trim() || undefined,
          sourceVersion: evidenceVersion.trim() || undefined,
          revisionDate: evidenceRevisionDate || undefined,
          jurisdiction: evidenceJurisdiction.trim() || undefined,
          topic: evidenceTopic.trim(),
          pageOrSection: evidenceSection.trim() || undefined,
          evidenceNote: evidenceNote.trim(),
          language,
        }),
      });
      setEvidencePublisher("");
      setEvidenceTitle("");
      setEvidenceUrl("");
      setEvidenceTopic("");
      setEvidenceNote("");
      setEvidenceMake("");
      setEvidenceModel("");
      setEvidenceVersion("");
      setEvidenceRevisionDate("");
      setEvidenceJurisdiction("");
      setEvidenceSection("");
      await refreshEvidenceSources();
      setNotice("Source saved privately. It is pending review and cannot be used for AI guidance yet.");
    } catch {
      setNotice("The source could not be saved. Check the link and source details.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    identityCheckCancelled.current = false;
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    void api<{ worker: { id: string } }>("/api/identity", { signal: controller.signal })
      .then(async (result) => {
        window.clearTimeout(timeout);
        if (!alive || identityCheckCancelled.current) return;
        setNotice("");
        setWorkerId(result.worker.id);
        setActiveScreen("work");
        setIdentityState("ready");
        try {
          const list = await api<{ sessions: WorkSession[] }>("/api/work-sessions");
          if (alive) setSessions(list.sessions);
          const sources = await api<{ sources: EvidenceSource[] }>("/api/evidence-sources");
          if (alive) setEvidenceSources(sources.sources);
        } catch {
          if (alive) setNotice("Your private preview could not be loaded. Refresh to retry.");
        }
      })
      .catch((error) => {
        window.clearTimeout(timeout);
        if (!alive || identityCheckCancelled.current) return;
        setIdentityState("welcome");
        // A first-time visitor has no session cookie yet. The API's 401 is
        // the expected anonymous state, not a preview-identity failure.
        if (error instanceof Error && error.message === "unauthorized") {
          setNotice("");
          return;
        }
        setNotice(controller.signal.aborted
          ? "The preview check timed out. Try opening the preview again."
          : "KIVORA couldn't connect to the preview service. Check your connection and try again.");
      });

    return () => {
      alive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  async function createIdentity() {
    identityCheckCancelled.current = true;
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ worker: { id: string } }>("/api/identity", { method: "POST" });
      setWorkerId(result.worker.id);
      setActiveScreen("work");
      setIdentityState("ready");
      try {
        await Promise.all([refreshSessions(), refreshEvidenceSources()]);
        setNotice("Your private preview is ready.");
      } catch {
        setNotice("Your preview is open, but saved history could not be loaded. Refresh to retry.");
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "request_failed";
      setNotice("We couldn't open your private preview (" + code + "). Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAccountBusy(true); setAccountNotice("");
    try {
      if (identityState === "sign-up") {
        const result = await api<{ message: string }>("/api/accounts/register", { method: "POST", body: JSON.stringify({ email: accountEmail.trim(), password: accountPassword }) });
        setAccountNotice(result.message || "Check your inbox to verify your email address.");
      } else {
        const result = await api<{ worker: { id: string } }>("/api/accounts/login", { method: "POST", body: JSON.stringify({ email: accountEmail.trim(), password: accountPassword }) });
        setWorkerId(result.worker.id); setIdentityState("ready"); setActiveScreen("work"); setAccountPassword("");
        await Promise.all([refreshSessions(), refreshEvidenceSources()]);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "account_request_failed";
      setAccountNotice(code === "email_delivery_unavailable" ? "Account email delivery is not configured yet. Your details were not registered. Sign-up will remain closed until verification email can be delivered." : code === "invalid_credentials" ? "Those sign-in details could not be verified. Check your email and password." : code === "email_already_registered" ? "An account with this email already exists. Try signing in instead." : code === "password_too_short" ? "Use a password with at least 12 characters." : "We couldn't complete that account request. Please try again.");
    } finally { setAccountBusy(false); }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validTrade = tradeSchema.safeParse(trade);
    const validLanguage = languageSchema.safeParse(language);
    const validUnits = unitSystemSchema.safeParse(units);
    const submittedTask = task.trim();
    const knownFacts = [
      measurements.trim() ? `Measurements: ${measurements.trim()}` : "",
      materials.trim() ? `Materials: ${materials.trim()}` : "",
      availableTools.trim() ? `Available tools: ${availableTools.trim()}` : "",
      constraints.trim() ? `Constraints: ${constraints.trim()}` : "",
    ].filter(Boolean);
    const sessionDescription = ["Question: " + submittedTask, ...knownFacts, jurisdiction.trim() ? "Work jurisdiction: " + jurisdiction.trim() : ""].filter(Boolean).join("\n\n");
    if (!validTrade.success || !validLanguage.success || !validUnits.success || !submittedTask) {
      setNotice("Add a job description and check your preferences.");
      return;
    }
    setBusy(true);
    setNotice("");
    setAssessment(null);
    setAssistantResponse(null);
    try {
      const result = await api<{ session: WorkSession }>("/api/work-sessions", {
        method: "POST",
        body: JSON.stringify({
          trade: validTrade.data,
          language: validLanguage.data,
          units: validUnits.data,
          task: sessionDescription,
        }),
      });
      setTask("");
      setMeasurements("");
      setMaterials("");
      setAvailableTools("");
      setConstraints("");
      setResearchSources([]);
      setResearchNotice("");
      setSavedResearchUrls([]);
      setActiveScreen("work");
      setActiveSession(result.session);
      setMessages([{
        id: "initial-task",
        role: "worker",
        content: sessionDescription,
        created_at: result.session.created_at,
      }]);
      await refreshSessions();
      try {
        const assistantResult = await api<{ assessment: IntelligenceAssessment; response: AssistantResponse }>("/api/assist", {
          method: "POST",
          body: JSON.stringify({
            sessionId: result.session.id,
            trade: validTrade.data,
            task: submittedTask,
            knownFacts,
            language: validLanguage.data,
            units: validUnits.data,
            jurisdiction: jurisdiction.trim() || undefined,
          }),
        });
        setAssessment(assistantResult.assessment);
        setAssistantResponse(assistantResult.response);
        setVerificationSaved(false);
        const assistantText = [
          assistantResult.response.summary,
          ...assistantResult.response.blocks.map(block => block.content),
          ...assistantResult.response.questions,
        ].join("\n\n");
        setMessages(previous => [...previous, {
          id: "assistant-response",
          role: "assistant",
          content: assistantText,
          created_at: Math.floor(Date.now() / 1000),
        }]);
        setNotice(assistantResult.response.status === "guided"
          ? "KIVORA prepared a response from reviewed evidence. Check its sources before acting."
          : assistantResult.response.status === "unavailable"
            ? "Your task is saved. AI inference is currently disabled; no technical procedure was generated."
            : "Your task is saved. Review the safety assessment and requested details before taking action.");
      } catch {
        setNotice("Your task is saved, but the assistant service is unavailable. No technical guidance was generated.");
      }
    } catch {
      setNotice("Your task could not be saved. It has not been sent to an AI service.");
    } finally {
      setBusy(false);
    }
  }

  async function searchResearchLeads() {
    if (!activeSession) return;
    setResearchBusy(true);
    setResearchNotice("");
    setResearchSources([]);
    try {
      const workerContext = messages.filter((message) => message.role === "worker").map((message) => message.content).join("\n\n").slice(-3600);
      const result = await api<{ sources: ResearchSource[]; notice: string; technicalGuidanceEnabled: false }>("/api/research", {
        method: "POST",
        body: JSON.stringify({
          sessionId: activeSession.id,
          trade: activeSession.trade,
          task: workerContext || activeSession.title,
          language: activeSession.language,
          units: activeSession.unit_system,
        }),
      });
      setResearchSources(result.sources);
      setResearchNotice(result.sources.length ? result.notice : "No source leads were returned. Try adding the product make, exact model or a more specific description to this investigation.");
    } catch {
      setResearchNotice("Research could not be completed. Check your connection and try again. No source has been marked verified.");
    } finally {
      setResearchBusy(false);
    }
  }

  async function saveResearchLead(source: ResearchSource) {
    if (!activeSession || savedResearchUrls.includes(source.url)) return;
    let publisher = "";
    try {
      const url = new URL(source.url);
      if (url.protocol !== "https:") {
        setResearchNotice("This result does not use HTTPS, so it cannot be saved to the evidence library.");
        return;
      }
      publisher = "Unverified host: " + url.hostname;
    } catch {
      setResearchNotice("This source link is invalid and cannot be saved.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/evidence-sources", {
        method: "POST",
        body: JSON.stringify({
          trade: activeSession.trade,
          sourceType: "other",
          publisher,
          title: source.title,
          sourceUrl: source.url,
          topic: activeSession.title.slice(0, 200) || "Research source lead",
          evidenceNote: source.excerpt,
          language: activeSession.language,
        }),
      });
      setSavedResearchUrls((current) => [...current, source.url]);
      await refreshEvidenceSources();
      setResearchNotice("Saved privately as pending review. It has not been authenticated or approved for technical guidance.");
    } catch {
      setResearchNotice("This source could not be saved. It remains an unverified search lead.");
    } finally {
      setBusy(false);
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSession || verificationSaved) return;
    const outcomeLabels: Record<string, string> = { not_tried: "Not tried yet", resolved: "The issue appears resolved", unchanged: "The issue remains", unexpected: "I observed a different result", expert: "I need qualified help" };
    const outcome = outcomeLabels[verificationOutcome];
    if (!outcome) return;
    const content = ["WORKER OBSERVATION — NOT INDEPENDENTLY VERIFIED", "Outcome: " + outcome, verificationNotes.trim() ? "Notes: " + verificationNotes.trim() : ""].filter(Boolean).join("\n");
    setBusy(true);
    setNotice("");
    try {
      await api("/api/work-sessions/" + activeSession.id + "/messages", { method: "POST", body: JSON.stringify({ content }) });
      const now = Math.floor(Date.now() / 1000);
      setMessages(previous => [...previous, { id: "verification-" + now, role: "worker", content, created_at: now }]);
      setVerificationSaved(true);
      setNotice("Your observation was saved to this private work session. It has not been treated as verified technical evidence.");
      await refreshSessions();
    } catch {
      setNotice("Your observation could not be saved. Please try again.");
    } finally { setBusy(false); }
  }
  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSession || !followUpText.trim()) return;
    const message = followUpText.trim();
    setBusy(true);
    setNotice("");
    setAssessment(null);
    setAssistantResponse(null);
    try {
      await api("/api/work-sessions/" + activeSession.id + "/messages", { method: "POST", body: JSON.stringify({ content: message }) });
      const workerMessages = messages.filter(item => item.role === "worker").map(item => item.content);
      const priorWorkerContext = workerMessages.length > 5 ? [workerMessages[0], ...workerMessages.slice(-4)] : workerMessages;
      const savedContext = priorWorkerContext.join("\n");
      const combinedTask = [...priorWorkerContext, message].join("\n\n").slice(-3900);
      const savedJurisdiction = savedContext.split("\n").find(line => line.startsWith("Work jurisdiction: "))?.slice("Work jurisdiction: ".length).trim();
      const equipmentLine = savedContext.split("\n").find(line => line.startsWith("Equipment details: "));
      const savedEquipment = equipmentLine?.match(/^Equipment details: make=([^;]+); model=(.+)$/i);
      const savedEquipmentFlag = savedContext.includes("Equipment involved: yes");
      const assistantResult = await api<{ assessment: IntelligenceAssessment; response: AssistantResponse }>("/api/assist", {
        method: "POST",
        body: JSON.stringify({ sessionId: activeSession.id, trade: activeSession.trade, task: combinedTask, language: activeSession.language, units: activeSession.unit_system, jurisdiction: jurisdiction.trim() || savedJurisdiction || undefined, involvesEquipment: involvesEquipment || savedEquipmentFlag || Boolean(savedEquipment), equipmentMake: equipmentMake.trim() || (savedEquipment?.[1].trim() !== "unknown" ? savedEquipment?.[1].trim() : undefined), equipmentModel: equipmentModel.trim() || (savedEquipment?.[2].trim() !== "unknown" ? savedEquipment?.[2].trim() : undefined) }),
      });
      const assistantText = [assistantResult.response.summary, ...assistantResult.response.blocks.map(block => block.content), ...assistantResult.response.questions].join("\n\n");
      const now = Math.floor(Date.now() / 1000);
      setMessages(previous => [...previous, { id: "worker-" + now, role: "worker", content: message, created_at: now }, { id: "assistant-" + now, role: "assistant", content: assistantText, created_at: now }]);
      setFollowUpText("");
      setAssessment(assistantResult.assessment);
      setAssistantResponse(assistantResult.response);
      setVerificationSaved(false);
      await refreshSessions();
      setNotice(assistantResult.response.status === "guided" ? "KIVORA checked your update against reviewed evidence." : assistantResult.response.status === "unavailable" ? "Your update is saved. AI inference is currently disabled; no technical procedure was generated." : "Your update is saved. Review the latest assessment and requested details before acting.");
    } catch {
      setNotice("Your update could not be fully processed. Check the saved work session before retrying.");
      try { const result = await api<{ session: WorkSession; messages: WorkMessage[] }>("/api/work-sessions/" + activeSession.id); setMessages(result.messages); } catch { /* Keep current local history visible. */ }
    } finally { setBusy(false); }
  }
  async function openSession(id: string) {
    setBusy(true);
    setNotice("");
    try {
      const result = await api<{ session: WorkSession; messages: WorkMessage[] }>(`/api/work-sessions/${id}`);
      setResearchSources([]);
      setResearchNotice("");
      setSavedResearchUrls([]);
      setActiveSession(result.session);
      setMessages(result.messages);
      const firstWorkerMessage = result.messages.find(message => message.role === "worker")?.content ?? "";
      const jurisdictionLine = firstWorkerMessage.split("\n").find(line => line.startsWith("Work jurisdiction: "));
      const equipmentLine = firstWorkerMessage.split("\n").find(line => line.startsWith("Equipment details: "));
      const equipmentDetails = equipmentLine?.match(/^Equipment details: make=([^;]+); model=(.+)$/i);
      setJurisdiction(jurisdictionLine?.slice("Work jurisdiction: ".length).trim() ?? "");
      setInvolvesEquipment(firstWorkerMessage.includes("Equipment involved: yes") || Boolean(equipmentDetails));
      setEquipmentMake(equipmentDetails?.[1].trim() !== "unknown" ? equipmentDetails?.[1].trim() ?? "" : "");
      setEquipmentModel(equipmentDetails?.[2].trim() !== "unknown" ? equipmentDetails?.[2].trim() ?? "" : "");
      setAssessment(null);
      setAssistantResponse(null);
      setVerificationSaved(false);
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
      setNotice("You have been logged out on this device. Start a new preview to continue.");
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
      setNotice("Your private preview identity has been deleted.");
    } catch {
      setNotice("Your preview identity could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const visibleSessions = sessions.filter((session) => (showArchived || !session.archived_at) && session.title.toLowerCase().includes(historyQuery.trim().toLowerCase()));

  if (identityState === "welcome") {
    return <PublicHome busy={busy} notice={notice} onGetStarted={() => void createIdentity()} onSignIn={() => { setIdentityState("sign-in"); setNotice(""); }} />;
  }

  if (identityState === "sign-in" || identityState === "sign-up") {
    const creatingAccount = identityState === "sign-up";
    return (
      <main className="page-shell auth-shell">
        <header className="topbar"><a className="brand" href="/" aria-label="KIVORA landing page" onClick={(event) => { event.preventDefault(); setIdentityState("welcome"); setAccountNotice(""); }}><span className="brand-mark">K</span><span>KIVORA</span></a><span className="topbar-note">Practical intelligence for skilled work</span></header>
        <section className="workspace identity-card auth-card">
          <p className="eyebrow">KIVORA ACCOUNT</p>
          <h2>{creatingAccount ? "Create your account." : "Welcome back."}</h2>
          <p className="privacy-note">{creatingAccount ? "Use your email and a strong password. Email verification is required before an account can be used." : "Sign in to return to your private investigations and saved evidence."}</p>
          <form onSubmit={(event) => void submitAccount(event)} className="account-form">
            <label className="field"><span>Email address</span><input type="email" autoComplete="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} required maxLength={254} placeholder="you@example.com" /></label>
            <label className="field"><span>Password</span><input type="password" autoComplete={creatingAccount ? "new-password" : "current-password"} value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} required minLength={creatingAccount ? 12 : 1} maxLength={128} placeholder={creatingAccount ? "At least 12 characters" : "Your password"} /></label>
            <button className="submit-button" type="submit" disabled={accountBusy || !accountEmail.trim() || !accountPassword}>{accountBusy ? "Please wait…" : creatingAccount ? "Create account" : "Sign in"} <span aria-hidden="true">↗</span></button>
          </form>
          {accountNotice && <p className="notice" role="status">{accountNotice}</p>}
          <div className="auth-switch"><span>{creatingAccount ? "Already have an account?" : "New to KIVORA?"}</span><button className="text-button" type="button" onClick={() => { setIdentityState(creatingAccount ? "sign-in" : "sign-up"); setAccountNotice(""); }}>{creatingAccount ? "Sign in" : "Create an account"}</button></div>
          <button className="text-button auth-back" type="button" onClick={() => { setIdentityState("welcome"); setAccountNotice(""); }}>Back to landing page</button>
        </section>
        <footer className="footer"><span>KIVORA</span><span>Built for the people who make things work.</span></footer>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="topbar app-topbar">
        <a className="brand" href="/" aria-label="KIVORA landing page" onClick={(event) => { event.preventDefault(); setIdentityState("welcome"); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <span className="brand-mark">K</span>
          <span>KIVORA</span>
        </a>
        <div className="app-topbar-right">
          <span className="workspace-status"><span className="status-dot" /> PRIVATE WORKSPACE</span>
          <span className="topbar-note">Practical intelligence for skilled work</span>
        </div>
      </header>

      {identityState !== "ready" && (
        <section className="hero">
          <p className="eyebrow">YOUR PRACTICAL INTELLIGENCE</p>
          <h1>Know what<br /><em>to do next.</em></h1>
          <p className="intro">Ask about a product, material, machine, technique or anything you want to understand. Start with what you know.</p>
        </section>
      )}

      {identityState === "checking" && (
        <section className="workspace identity-card">
          <p className="eyebrow">PRIVATE PREVIEW</p>
          <h2>Opening your KIVORA preview…</h2>
          <p className="privacy-note">Checking your private preview identity.</p>
        </section>
      )}

      {identityState === "ready" && (
        <>
          <section className="app-welcome-strip">
            <div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h1>{activeScreen === "work" ? "What are we working through?" : activeScreen === "history" ? "Your investigations" : activeScreen === "sources" ? "Evidence library" : activeScreen === "payments" ? "Connected payments" : "Account & access"}</h1>
              <p>{activeScreen === "work" ? "Bring the question, product or problem. KIVORA helps you work out the next step." : activeScreen === "history" ? "Pick up where you left off." : activeScreen === "sources" ? "Keep useful references and source notes together." : activeScreen === "payments" ? "Optional payment tools. Your KIVORA workspace does not require a wallet." : "Manage this private workspace and its data."}</p>
            </div>
            <div className="intelligence-signature"><span className="sparkle-mark">✦</span><span><strong>KIVORA intelligence</strong><small>Evidence-aware workspace</small></span></div>
          </section>
          <nav className="workspace-nav" aria-label="Workspace sections">
            {([["work","Home","⌂"],["history","History","◷"],["sources","Evidence","▤"],["payments","Payments","⇄"],["account","Account","○"]] as const).map(([screen,label,glyph]) => <button key={screen} type="button" className={activeScreen === screen ? "workspace-nav-item active" : "workspace-nav-item"} aria-current={activeScreen === screen ? "page" : undefined} onClick={() => { setActiveScreen(screen); setNotice(""); }}><span className="nav-glyph" aria-hidden="true">{glyph}</span><span>{label}</span></button>)}
          </nav>

          
          {activeScreen === "work" && <>
          <section className="workspace" aria-labelledby="start-title">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">ASK KIVORA</p>
                <h2 id="start-title">What would you like to understand today?</h2>
              </div>
              <span className="step-label">01 / START</span>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)}>
              <p className="consultation-hint">You do not need to choose a trade or know the technical terms. Ask in your own words.</p>

              <label className="field task-field">
                <span>Your question</span>
                <textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="What are you trying to understand? It could be a product, machine, material, technique, unfamiliar term or a problem you have come across." rows={5} maxLength={2000} />
              </label>

              <details className="intake-context">
                <summary>+ Add details (optional)</summary>
                <p className="eyebrow">CONTEXT THAT MAY HELP</p>
                <p className="privacy-note">Add only what you know. None of these details is required to ask KIVORA.</p>
                <div className="field-grid">
                  <label className="field">
                    <span>Trade or area (optional)</span>
                    <select value={trade} onChange={(event) => setTrade(event.target.value as Trade)}>
                      {trades.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Response language</span>
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
                <label className="field">
                  <span>Country or jurisdiction (optional)</span>
                  <input value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} placeholder="For example, Nigeria" />
                </label>
                <p className="privacy-note">If a specific product or machine matters to your question, KIVORA can ask for its manufacturer or exact model later in the conversation.</p>
                <label className="field">
                  <span>Measurements and dimensions</span>
                  <textarea value={measurements} onChange={(event) => setMeasurements(event.target.value)} rows={2} maxLength={450} placeholder="For example: opening width, depth, thickness, pipe diameter or observed readings. Include units." />
                </label>
                <label className="field">
                  <span>Materials or components involved</span>
                  <textarea value={materials} onChange={(event) => setMaterials(event.target.value)} rows={2} maxLength={450} placeholder="For example: MDF, plywood, copper pipe, PVC fitting, hinge type or component label." />
                </label>
                <label className="field">
                  <span>Tools and equipment available</span>
                  <textarea value={availableTools} onChange={(event) => setAvailableTools(event.target.value)} rows={2} maxLength={450} placeholder="What tools can you actually use for this job?" />
                </label>
                <label className="field">
                  <span>Constraints or what you have already tried</span>
                  <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} rows={2} maxLength={450} placeholder="Access, time, space, budget, parts available, previous attempts or anything that limits the work." />
                </label>
              </details>

              <button className="submit-button" type="submit" disabled={busy || !task.trim()}>
                {busy ? "Sending…" : "Ask KIVORA"} <span aria-hidden="true">↗</span>
              </button>
              <p className="privacy-note">Your question is saved in your private history. Avoid passwords, access codes and customer personal details. AI inference is currently disabled; this preview will not generate live AI guidance.</p>
            </form>
          </section>

          {assessment && (
            <section className="workspace assessment-card" aria-live="polite">
              <div className="workspace-heading">
                <div>
                  <p className="eyebrow">INITIAL WORK ASSESSMENT</p>
                  <h2>{assessment.decision === "escalate" ? "Stop and get qualified help" : assessment.decision === "clarify" ? "A few details are still needed" : "Evidence requirements met"}</h2>
                </div>
                <div className="assessment-heading-actions">
                  <span className="step-label">{assessment.safetyLevel.toUpperCase()}</span>
                  <SpeechPlayback
                    language={activeSession?.language ?? language}
                    text={[
                      assessment.decision === "escalate" ? "Stop and get qualified help." : assessment.decision === "clarify" ? "A few details are still needed." : "Evidence requirements met.",
                      "Safety level: " + assessment.safetyLevel + ".",
                      ...assessment.detectedHazards.map((hazard) => "Risk signal: " + hazard.replace(/-/g, " ") + "."),
                      ...assessment.permittedGuidance,
                      ...assessment.questions,
                      "Compatibility status: " + assessment.compatibilityStatus + ".",
                      "This is a preliminary deterministic assessment, not an AI answer, complete risk assessment or technical procedure.",
                    ].join("\n\n")}
                  />
                </div>
              </div>
              {assessment.detectedHazards.length > 0 && (
                <div className="assessment-group">
                  <h3>Detected risk signals</h3>
                  <ul>{assessment.detectedHazards.map((hazard) => <li key={hazard}>{hazard.replace(/-/g, " ")}</li>)}</ul>
                </div>
              )}
              {assessment.permittedGuidance.length > 0 && (
                <div className="assessment-group">
                  <h3>Immediate safety guidance</h3>
                  <ul>{assessment.permittedGuidance.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              {assessment.questions.length > 0 && (
                <div className="assessment-group">
                  <h3>What KIVORA needs to know</h3>
                  <ul>{assessment.questions.map((question) => <li key={question}>{question}</li>)}</ul>
                </div>
              )}
              {language !== "en" && <p className="privacy-note">Safety assessment wording is currently available in English only. Reviewed Nigerian English, Pidgin and French safety wording is not ready yet.</p>}
              <p className="privacy-note">Compatibility: {assessment.compatibilityStatus}. This is a preliminary deterministic assessment, not an AI answer, complete risk assessment or technical procedure.</p>
            </section>
          )}

          {assistantResponse && (
            <section className="workspace assistant-card" aria-live="polite">
              <div className="workspace-heading">
                <div>
                  <p className="eyebrow response-eyebrow"><span className="sparkle-mark small">✦</span> KIVORA RESPONSE</p>
                  <h2>{assistantResponse.status === "guided" ? "What the reviewed evidence says" : assistantResponse.status === "escalate" ? "Safety comes first" : assistantResponse.status === "clarify" ? "A few things need confirming" : "AI response unavailable"}</h2>
                </div>
                <div className="assessment-heading-actions">
                  <span className="step-label">{assistantResponse.status.toUpperCase()}</span>
                  <SpeechPlayback
                    language={activeSession?.language ?? language}
                    text={[
                      assistantResponse.summary,
                      ...assistantResponse.blocks.map((block) => block.content),
                      ...assistantResponse.questions,
                      ...assistantResponse.citations.map((source) => "Source: " + source.publisher + ". " + source.title + ". " + [source.productMake, source.productModels?.join(", "), source.sourceVersion, source.revisionDate, source.jurisdiction, source.pageOrSection].filter(Boolean).join(". ")),
                      "Compatibility status: " + assistantResponse.compatibilityStatus + ".",
                      "Check the cited sources before acting. This is not a substitute for professional judgement or a site-specific risk assessment.",
                    ].join("\n\n")}
                  />
                </div>
              </div>
              <p className="assistant-summary">{assistantResponse.summary}</p>
              {assistantResponse.blocks.map((block, index) => (
                <article className="assistant-block" key={index}>
                  <h3>{block.kind === "procedure" ? "Evidence-backed steps" : block.kind === "measurement" ? "Measurements" : block.kind === "parts" ? "Parts and components" : block.kind === "safety" ? "Safety" : "Explanation"}</h3>
                  <p>{block.content}</p>
                </article>
              ))}
              {assistantResponse.questions.length > 0 && (
                <div className="assessment-group">
                  <h3>Follow-up questions</h3>
                  <ul>{assistantResponse.questions.map((question, index) => <li key={index}>{question}</li>)}</ul>
                </div>
              )}
              {assistantResponse.citations.length > 0 && (
                <div className="assessment-group">
                  <h3>Sources used</h3>
                  <ul>{assistantResponse.citations.map(source => (
                    <li key={source.id}>
                      {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.publisher} — {source.title}</a> : <span>{source.publisher} — {source.title}</span>}
                      {[source.productMake, source.productModels?.join(", "), source.sourceVersion, source.revisionDate, source.jurisdiction, source.pageOrSection].filter(Boolean).join(" · ") && (
                        <small className="citation-meta">{[source.productMake, source.productModels?.join(", "), source.sourceVersion, source.revisionDate, source.jurisdiction, source.pageOrSection].filter(Boolean).join(" · ")}</small>
                      )}
                    </li>
                  ))}</ul>
                </div>
              )}
              {assistantResponse.status === "guided" && activeSession && (
                <form onSubmit={(event) => void submitVerification(event)} className="verification-form">
                  <p className="eyebrow">CLOSE THE LOOP</p>
                  <h3>What happened when you checked this?</h3>
                  <p className="privacy-note">Record what you observed. This stays in your private work history and is not automatically treated as verified technical knowledge.</p>
                  <label className="field">
                    <span>Your outcome</span>
                    <select value={verificationOutcome} onChange={(event) => setVerificationOutcome(event.target.value)} disabled={verificationSaved}>
                      <option value="not_tried">I have not tried it yet</option>
                      <option value="resolved">The issue appears resolved</option>
                      <option value="unchanged">The issue remains</option>
                      <option value="unexpected">I observed a different result</option>
                      <option value="expert">I need qualified help</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>What did you observe? (optional)</span>
                    <textarea value={verificationNotes} onChange={(event) => setVerificationNotes(event.target.value)} rows={2} maxLength={1000} placeholder="Describe the result, what changed or what still needs checking." disabled={verificationSaved} />
                  </label>
                  <button className="submit-button" type="submit" disabled={busy || verificationSaved}>
                    {verificationSaved ? "Observation saved" : busy ? "Saving…" : "Save work observation"}
                  </button>
                </form>
              )}
              <p className="privacy-note">Compatibility remains {assistantResponse.compatibilityStatus}. KIVORA only returns model-generated technical content when its evidence references pass validation; this is not a substitute for professional judgement or a site-specific risk assessment.</p>
            </section>
          )}

          {activeSession && (
            <section className="workspace research-card" aria-live="polite">
              <div className="workspace-heading">
                <div>
                  <p className="eyebrow">SOURCE DISCOVERY</p>
                  <h2>Find technical sources</h2>
                </div>
                <span className="step-label">RESEARCH</span>
              </div>
              <p className="privacy-note">Search results are unverified leads. A matching website or manufacturer name does not prove that a document is authentic, current or applicable to your exact model. These results cannot authorize a procedure or specification.</p>
              <button className="submit-button" type="button" onClick={() => void searchResearchLeads()} disabled={researchBusy || busy}>
                {researchBusy ? "Searching…" : researchSources.length ? "Search again" : "Search for source leads"} <span aria-hidden="true">↗</span>
              </button>
              {researchNotice && <p className="research-notice" role="status">{researchNotice}</p>}
              {researchSources.length > 0 && (
                <div className="research-list">
                  {researchSources.map((source) => (
                    <article className="research-item" key={source.url}>
                      <div className="research-item-heading">
                        <span className="evidence-status">UNVERIFIED LEAD</span>
                        <span className="research-domain">{(() => { try { return new URL(source.url).hostname; } catch { return "External source"; } })()}</span>
                      </div>
                      <h3>{source.title}</h3>
                      <p>{source.excerpt}</p>
                      <div className="research-actions">
                        <a href={source.url} target="_blank" rel="noreferrer">Open source</a>
                        <button className="text-button" type="button" onClick={() => void saveResearchLead(source)} disabled={busy || savedResearchUrls.includes(source.url)}>
                          {savedResearchUrls.includes(source.url) ? "Saved · pending review" : "Save privately for review"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          </>}

          {activeScreen === "history" && <section className="workspace session-library">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">YOUR PRIVATE HISTORY</p>
                <h2>Recent conversations</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setShowArchived((value) => !value)}>
                {showArchived ? "Hide archived" : "Show archived"}
              </button>
            </div>
            <label className="history-search">
              <span>Search your investigations</span>
              <input type="search" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search by product, problem or topic" />
            </label>
            <div className="history-summary"><span>{visibleSessions.length} {visibleSessions.length === 1 ? "investigation" : "investigations"}</span><span>{showArchived ? "Including archived" : "Active investigations"}</span></div>
            {visibleSessions.length === 0 ? (
              <p className="history-empty">{historyQuery.trim() ? "No investigations match that search. Try another word." : "Your investigations will appear here. Start a new one whenever you need to understand a product, material, machine or problem."}</p>
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

          }

          {activeScreen === "sources" && <section className="workspace evidence-library">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">TECHNICAL SOURCES</p>
                <h2>Your evidence library</h2>
              </div>
              <span className="step-label">{evidenceSources.length} SAVED</span>
            </div>
            <p className="privacy-note">Record where a technical fact came from. Notes stay private to this worker and remain pending review. They do not currently unlock AI guidance. Do not paste long copyrighted manual passages.</p>
            <form onSubmit={(event) => void saveEvidenceSource(event)} className="evidence-form">
              <div className="field-grid">
                <label className="field">
                  <span>Source type</span>
                  <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
                    <option value="manufacturer_manual">Manufacturer manual</option>
                    <option value="technical_bulletin">Technical bulletin</option>
                    <option value="service_notice">Service notice</option>
                    <option value="standard">Standard or regulation</option>
                    <option value="field_observation">Field observation</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Publisher / manufacturer</span>
                  <input value={evidencePublisher} onChange={(event) => setEvidencePublisher(event.target.value)} maxLength={200} placeholder="Who published it?" required />
                </label>
              </div>
              <label className="field">
                <span>Source title</span>
                <input value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} maxLength={300} placeholder="Manual, bulletin or reference title" required />
              </label>
              <label className="field">
                <span>Source link (HTTPS)</span>
                <input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Product make (if relevant)</span>
                  <input value={evidenceMake} onChange={(event) => setEvidenceMake(event.target.value)} placeholder="Manufacturer" />
                </label>
                <label className="field">
                  <span>Exact model (if relevant)</span>
                  <input value={evidenceModel} onChange={(event) => setEvidenceModel(event.target.value)} placeholder="Model number" />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Document version / revision</span>
                  <input value={evidenceVersion} onChange={(event) => setEvidenceVersion(event.target.value)} maxLength={120} placeholder="Revision, edition or version" />
                </label>
                <label className="field">
                  <span>Revision date</span>
                  <input type="date" value={evidenceRevisionDate} onChange={(event) => setEvidenceRevisionDate(event.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Jurisdiction / region (if relevant)</span>
                <input value={evidenceJurisdiction} onChange={(event) => setEvidenceJurisdiction(event.target.value)} maxLength={120} placeholder="For example, Nigeria or UK" />
              </label>
              <label className="field">
                <span>Topic this source supports</span>
                <input value={evidenceTopic} onChange={(event) => setEvidenceTopic(event.target.value)} maxLength={200} placeholder="For example, tap cartridge identification" required />
              </label>
              <label className="field">
                <span>Page or section</span>
                <input value={evidenceSection} onChange={(event) => setEvidenceSection(event.target.value)} maxLength={120} placeholder="Page, chapter or section reference" />
              </label>
              <label className="field">
                <span>Your concise evidence note</span>
                <textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} rows={3} maxLength={2000} placeholder="Summarise the specific fact and its context in your own words." required />
              </label>
              <button className="submit-button" type="submit" disabled={busy || !evidencePublisher.trim() || !evidenceTitle.trim() || !evidenceTopic.trim() || !evidenceNote.trim()}>
                {busy ? "Saving…" : "Save private source"} <span aria-hidden="true">↗</span>
              </button>
            </form>
            {evidenceSources.length > 0 && (
              <div className="evidence-list">
                {evidenceSources.map((source) => (
                  <article className="evidence-item" key={source.id}>
                    <div>
                      <span className="evidence-status">{source.source_type === "field_observation" ? "FIELD OBSERVATION · PENDING REVIEW · PRIVATE" : "PENDING REVIEW · PRIVATE"}</span>
                      <h3>{source.title}</h3>
                      <p>{source.publisher} · {source.topic}</p>
                      <p className="evidence-meta">
                        {[source.product_make, source.product_model, source.source_version, source.revision_date, source.jurisdiction, source.page_or_section].filter(Boolean).join(" · ") || "Product model, revision and scope not recorded"}
                      </p>
                      {source.source_type === "field_observation" && <p className="evidence-meta">One-job report only. It is not independent proof of a general procedure or compatibility.</p>}
                    </div>
                    {source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer">Open source</a>}
                  </article>
                ))}
              </div>
            )}
          </section>



          }

          {activeScreen === "work" && activeSession && (
            <section className="workspace active-session">
              <div className="workspace-heading">
                <div>
                  <p className="eyebrow">SAVED INVESTIGATION</p>
                  <h2>{activeSession.title}</h2>
                </div>
                <button className="text-button" type="button" onClick={() => { setActiveSession(null); setMessages([]); }}>Close</button>
              </div>
              <div className="message-list">
                {messages.map((message) => (
                  <article className={message.role === "assistant" ? "message-card assistant-message" : "message-card worker-message"} key={message.id}>
                    <span className="message-role">{message.role === "worker" ? "YOU" : message.role.toUpperCase()}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
              <form onSubmit={(event) => void submitFollowUp(event)} className="follow-up-form">
                <label className="field">
                  <span>Continue this investigation</span>
                  <textarea value={followUpText} onChange={(event) => setFollowUpText(event.target.value)} rows={3} maxLength={2000} placeholder="Ask another question, add a measurement, describe what changed or explore another part of this subject." />
                </label>
                <button className="submit-button" type="submit" disabled={busy || !followUpText.trim()}>
                  {busy ? "Checking…" : "Continue investigation"} <span aria-hidden="true">↗</span>
                </button>
              </form>
              <p className="privacy-note">Your latest worker updates are checked together with the work-session context. Missing reviewed evidence still prevents unsupported technical procedures.</p>
            </section>
          )}

          {activeScreen === "payments" && <WalletPanel />}

          {activeScreen === "account" && <section className="workspace account-card">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">PREVIEW ACCESS</p>
                <h2>Your preview identity</h2>
              </div>
              <span className="step-label">ACTIVE</span>
            </div>
            <p className="privacy-note">Temporary anonymous preview ID: {workerId.slice(0, 8)}…{workerId.slice(-4)}. This is not your final KIVORA account. Final accounts will use email and password, with email verification and password reset. Your preview sessions remain private.</p>
            <div className="account-actions">
              <button className="unit-option" type="button" onClick={() => void logout()} disabled={busy}>Log out on this device</button>
              <button className="unit-option danger-option" type="button" onClick={() => void deleteIdentity()} disabled={busy}>Delete preview identity and all data</button>
            </div>
          </section>}

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
