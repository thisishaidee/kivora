type PublicHomeProps = {
  busy: boolean;
  notice: string;
  onGetStarted: () => void;
  onSignIn: () => void;
  onCreateAccount: () => void;
};

const trades = [
  "Carpentry & furniture",
  "Electrical",
  "Plumbing",
  "HVAC & refrigeration",
  "Mechanical repair",
  "Construction & installation",
];

export default function PublicHome({ busy, notice, onGetStarted, onSignIn, onCreateAccount }: PublicHomeProps) {
  return (
    <div className="public-home">
      <header className="public-header">
        <a className="brand" href="/" aria-label="KIVORA home">
          <span className="brand-mark">K</span>
          <span>KIVORA</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#trades">For every trade</a>
          <button type="button" className="public-signin" onClick={onSignIn}>Sign in</button>
          <button type="button" className="public-nav-cta" onClick={onCreateAccount}>Create account</button>
        </nav>
      </header>

      <main>
        <section className="public-hero">
          <div className="public-hero-copy">
            <p className="eyebrow">PRACTICAL INTELLIGENCE FOR SKILLED WORK</p>
            <h1>Know what<br /><em>to do next.</em></h1>
            <p className="public-lede">When you meet an unfamiliar product, material, machine or technique, KIVORA helps you understand it, investigate what matters and make a more informed next move.</p>
            <div className="public-actions">
              <button type="button" className="public-primary" onClick={onGetStarted} disabled={busy}>{busy ? "Opening workspace…" : "Explore the workspace"} <span aria-hidden="true">↗</span></button>
              <a className="public-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <p className="public-disclosure">Account registration will open once secure email verification is configured. You can explore the workspace in the meantime.</p>
            {notice && <p className="public-notice" role="status">{notice}</p>}
          </div>

          <div className="public-demo" aria-label="Illustrative example of a KIVORA question">
            <div className="demo-topline"><span className="demo-dot" /> A WORKSHOP INVESTIGATION <span className="demo-label">PRODUCT EXAMPLE</span></div>
            <div className="demo-context"><span className="demo-context-icon">⌁</span><span><strong>Mechanical · Workshop equipment</strong><small>Understanding a compressor fault</small></span></div>
            <p className="demo-question">“My workshop air compressor runs, but the tank pressure barely rises. What should I investigate before replacing parts?”</p>
            <div className="demo-divider" />
            <div className="demo-response-head"><span className="demo-mark">✦</span><span>KIVORA INVESTIGATION PATH</span></div>
            <p className="demo-response">Start by separating what you can observe from what still needs confirmation. The exact make, model and pressure behaviour matter before drawing conclusions.</p>
            <div className="demo-checks">
              <div><span>01</span><strong>Identify the equipment</strong><small>Record the make, model and rating plate details.</small></div>
              <div><span>02</span><strong>Capture the symptoms</strong><small>Note gauge readings, unusual sounds and when the pressure stops rising.</small></div>
              <div><span>03</span><strong>Check the right evidence</strong><small>Find the matching manufacturer manual and its safety instructions.</small></div>
            </div>
            <div className="demo-context-footer"><span>TOOLS AVAILABLE</span><strong>Pressure gauge · Leak-detection solution · Model plate</strong></div>
            <p className="demo-footnote">Illustrative workflow only. No repair instruction is generated without applicable evidence and safety checks.</p>
          </div>
        </section>

        <section className="public-principles" id="how-it-works">
          <div className="public-section-intro">
            <p className="eyebrow">MORE THAN QUICK ANSWERS</p>
            <h2>Understand the work.<br /><em>Then decide what comes next.</em></h2>
          </div>
          <div className="principle-grid">
            <article><span>01</span><h3>Ask naturally</h3><p>Describe what you are trying to understand, even if you do not know the right technical terms yet.</p></article>
            <article><span>02</span><h3>Investigate properly</h3><p>Bring together product details, reliable references and the job context that changes an answer.</p></article>
            <article><span>03</span><h3>Know what is certain</h3><p>Clear answers should distinguish verified information from assumptions, missing details and situations that need qualified help.</p></article>
            <article><span>04</span><h3>Read or listen</h3><p>Read a response on screen or listen to it with voice playback.</p></article>
          </div>
        </section>

        <section className="public-trades" id="trades">
          <div><p className="eyebrow">BUILT ACROSS TRADES</p><h2>One place to keep<br /><em>learning and moving.</em></h2><p>One investigation workflow for independent workers across skilled trades — not one trade, one tool or one kind of problem.</p></div>
          <ul>{trades.map((trade) => <li key={trade}><span>{trade}</span><span aria-hidden="true">↗</span></li>)}</ul>
        </section>

        <section className="public-trust">
          <p className="eyebrow">USEFUL, WITHOUT PRETENDING</p>
          <h2>Confidence comes from knowing what you know — and what you don't.</h2>
          <p>KIVORA is designed to keep evidence, uncertainty and safety visible throughout an investigation. It should never invent a product specification or present an unverified guess as a proven instruction.</p>
          <button type="button" className="public-primary" onClick={onGetStarted} disabled={busy}>Explore the preview <span aria-hidden="true">↗</span></button>
        </section>
      </main>

      <footer className="public-footer"><span>KIVORA</span><span>Built for the people who make things work.</span><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a></footer>
    </div>
  );
}
