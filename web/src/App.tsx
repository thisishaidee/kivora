import { useState } from "react";
import type { FormEvent } from "react";
import {
  languageSchema,
  tradeSchema,
  unitSystemSchema,
  type Language,
  type Trade,
  type UnitSystem,
} from "../../shared/src/contracts";

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

export default function App() {
  const [trade, setTrade] = useState<Trade>("carpentry");
  const [language, setLanguage] = useState<Language>("en");
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [task, setTask] = useState("");
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const preferences = {
      trade: tradeSchema.parse(trade),
      language: languageSchema.parse(language),
      units: unitSystemSchema.parse(units),
    };
    if (!task.trim()) {
      setNotice("Describe the job or problem to get started.");
      return;
    }
    setNotice("The guided work-session flow is not connected yet. Your draft stays on this device and has not been sent.");
    console.info("KIVORA local draft preferences", preferences);
  }

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

      <section className="workspace" aria-labelledby="start-title">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">WORKSPACE</p>
            <h2 id="start-title">What are you working on?</h2>
          </div>
          <span className="step-label">01 / START</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span>Your trade</span>
              <select value={trade} onChange={(e) => setTrade(e.target.value as Trade)}>
                {trades.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
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
            <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="What are you trying to do? What have you noticed? Include a product or model number if you have one." rows={5} />
          </label>

          <button className="submit-button" type="submit">Continue <span aria-hidden="true">↗</span></button>
          <p className="privacy-note">Your work is yours. Private worker sessions are part of the next build stage.</p>
          {notice && <p className="notice" role="status">{notice}</p>}
        </form>
      </section>

      <footer className="footer">
        <span>KIVORA</span>
        <span>Built for the people who make things work.</span>
      </footer>
    </main>
  );
}
