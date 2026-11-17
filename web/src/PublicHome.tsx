type PublicHomeProps = {
  busy: boolean;
  notice: string;
  onGetStarted: () => void;
  onSignIn: () => void;
};

const trades = [
  "Carpentry & furniture",
  "Electrical",
  "Plumbing",
  "HVAC & refrigeration",
  "Mechanical repair",
  "Construction & installation",
];

export default function PublicHome({ busy, notice, onGetStarted, onSignIn }: PublicHomeProps) {
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
          <button type="button" className="public-nav-cta" onClick={onGetStarted} disabled={busy}>Try the preview</button>
        </nav>
      </header>

      <main>
        <section className="public-hero">
          <div className="public-hero-copy">
            <p className="eyebrow">PRACTICAL INTELLIGENCE FOR SKILLED WORK</p>
            <h1>Know what<br /><em>to do next.</em></h1>
            <p className="public-lede">When you meet an unfamiliar product, material, machine or technique, KIVORA helps you understand it, investigate what matters and make a more informed next move.</p>
            <div className="public-actions">
              <button type="button" className="public-primary" onClick={onGetStarted} disabled={busy}>{busy ? "Opening preview…" : "Try KIVORA preview"} <span aria-hidden="true">↗</span></button>
              <a className="public-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <p className="public-disclosure">The current preview uses a private recovery key. Email and phone sign-up are not available yet.</p>
            {notice && <p className="public-notice" role="status">{notice}</p>}
          </div>

          <div className="public-demo" aria-label="Illustrative example of a KIVORA question">
            <div className="demo-topline"><span className="demo-dot" /> AN EXAMPLE QUESTION <span className="demo-label">ILLUSTRATIVE</span></div>
            <p className="demo-question">“I have this cabinet hinge, but I don't know what type it is or how to fit it.”</p>
            <div className="demo-divider" />
            <div className="demo-response-head"><span className="demo-mark">K</span><span>KIVORA INTELLIGENCE</span></div>
            <p className="demo-response">Start by identifying the hinge before choosing a fitting method. The cup diameter, overlay and mounting plate all matter.</p>
            <div className="demo-next"><span>01</span><span>Identify the component</span><span>↗</span></div>
            <div className="demo-next"><span>02</span><span>Check the exact model and fit</span><span>↗</span></div>
            <div className="demo-next"><span>03</span><span>Confirm the next safe step</span><span>↗</span></div>
            <p className="demo-footnote">Example only — not a live AI response or verified fitting instruction.</p>
          </div>
        </section>

        <section className="public-principles" id="how-it-works">
          <div className="public-section-intro">
            <p className="eyebrow">MORE THAN QUICK ANSWERS</p>
            <h2>Understand the work.<br /><em>Then decide what comes next.</em></h2>
          </div>
          <div className="principle-grid">
            <article><span>01</span><h3>Ask naturally</h3><p>Describe what you are trying to understand, even if you do not know the right technical terms yet.</p></article>
            <article><span>02</span><h3>Investigate properly</h3><p>KIVORA is designed to bring together relevant product details, reliable references and the context that changes an answer.</p></article>
            <article><span>03</span><h3>Know what is certain</h3><p>Clear answers should distinguish verified information from assumptions, missing details and situations that need qualified help.</p></article>
            <article><span>04</span><h3>Read or listen</h3><p>Results are being designed for both reading and listening, so workers can choose how to take in information.</p></article>
          </div>
        </section>

        <section className="public-trades" id="trades">
          <div><p className="eyebrow">BUILT ACROSS TRADES</p><h2>One place to keep<br /><em>learning and moving.</em></h2><p>KIVORA is being built for independent workers and skilled people across different fields — not one trade, one tool or one kind of problem.</p></div>
          <ul>{trades.map((trade) => <li key={trade}><span>{trade}</span><span aria-hidden="true">↗</span></li>)}</ul>
        </section>

        <section className="public-trust">
          <p className="eyebrow">USEFUL, WITHOUT PRETENDING</p>
          <h2>Confidence comes from knowing what you know — and what you don't.</h2>
          <p>KIVORA is being built to treat evidence, uncertainty and safety as part of the answer. It should never invent a product specification or present an unverified guess as a proven instruction.</p>
          <button type="button" className="public-primary" onClick={onGetStarted} disabled={busy}>Explore the preview <span aria-hidden="true">↗</span></button>
        </section>
      </main>

      <footer className="public-footer"><span>KIVORA</span><span>Built for the people who make things work.</span><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a></footer>
    </div>
  );
}
