# KIVORA Screen and User-Journey Specification

**Companion to:** [Product Blueprint](PRODUCT-BLUEPRINT.md)  
**Status:** Initial mobile-first screen specification for implementation planning.

## 1. Experience architecture

KIVORA has two application states:
- Public visitor experience: explain the product and allow safe public exploration.
- Authenticated experience: personal account, consultations, saved knowledge, profile and community participation.

There is no workspace-creation step. A single account can own many independent consultation threads. A thread may concern a job, a machine, a material, a technique, a business question or general learning.

### Primary navigation after sign-in

- Home
- Ask KIVORA
- Discover
- Profile

Community is a secondary destination, reachable from Discover or a secondary navigation entry. Settings is reached from the profile/account menu.

On narrow mobile screens, use a compact bottom navigation with clear labels and a prominent consultation action. Do not overload the first viewport.

## 2. Screen specifications

## Screen 01 — Public Home

**Goal:** Make a first-time visitor understand within seconds what KIVORA does and why it is useful.

### First viewport
- KIVORA wordmark and concise navigation.
- Headline: "Practical intelligence for skilled work."
- Supporting message: KIVORA helps workers understand unfamiliar machines, materials, tools and techniques, research practical questions and decide what to do next.
- Primary action: "Get started" / "Create account".
- Secondary action: "Explore what KIVORA can do".
- A product example showing a worker asking a real question and KIVORA returning a structured, sourced explanation with a listen control.

### Below the fold
- How it works: Ask → KIVORA researches when needed → Understand the result → Read or listen → Decide next step.
- Multi-trade coverage without implying that one trade is the whole product.
- Examples: machine learning, material comparison, technique research, practical problem-solving.
- Text + voice demonstration.
- Trust commitments: sources, visible uncertainty, safety boundaries, private consultations.
- Community shown as a supporting way to learn from other workers, not the hero.
- Footer with sign in, sign up, privacy, terms and contact links when those pages exist.

### States
- Loading and network error must not leave an empty hero.
- Public examples must be labelled as demonstrations and must not imply live AI inference if it is not enabled.
- Public content must not expose private consultations or unlicensed source documents.

## Screen 02 — Authentication

**Goal:** Create a secure personal account without making the user understand workspaces, wallets or Web3.

### Sign-up flow
1. Choose an available method: email or phone (only show methods that are implemented and deliverable).
2. Enter the contact detail.
3. Complete verification.
4. Set any required account credentials or passkey step supported by the chosen provider.
5. Add professional details now or skip and complete them later.
6. Land on Home.

### Sign-in and recovery
- Sign in with the verified method.
- Offer secure recovery using the selected identity provider's supported flow.
- Verify contact changes.
- Provide clear errors and resend limits.
- Do not reveal whether an arbitrary email/phone is registered through account-enumeration-prone messages.

**Provider decision:** Email-first is acceptable for an initial release if phone OTP is not reliable or affordable. Do not display a phone sign-up button until delivery, recovery, abuse controls and cost are tested for Nigeria and intended markets.

## Screen 03 — Signed-in Home

**Goal:** Make the next useful action obvious and encourage return visits even when the worker has no urgent problem.

### Content order
1. Greeting and compact profile/trade context (if supplied).
2. Prominent consultation composer: "What would you like to understand today?"
3. Recent conversations, with titles, last activity and a new-consultation action.
4. Discovery recommendations: practical, relevant and varied.
5. Optional secondary community highlights.
6. Saved knowledge shortcut.

### Interaction
- Submitting the composer opens a new consultation thread.
- Recent thread selection reopens that thread.
- "New question" starts a separate thread without erasing prior history.
- Profile/trade information may improve recommendations but never blocks consultation.
- No job type, model number, measurements or jurisdiction questionnaire on the Home screen.

### Empty state
For a new user, show a simple welcome and a few suggested questions across different trades. Do not fabricate recent activity or community posts.

## Screen 04 — Ask KIVORA

**Goal:** Provide a natural, ongoing consultation with integrated research.

### Layout
- Conversation title and history.
- Message composer supporting text.
- Attach image/context affordance where implemented.
- Voice input affordance only when the speech-to-text path is functional.
- Send action.
- New consultation action and access to prior threads.
- Research status shown only when KIVORA is actually retrieving or analysing sources.

### Conversation behaviour
- The first message can be broad and informal.
- KIVORA should answer directly when sufficient, research when useful, and ask a focused clarification only when needed.
- A question can branch into a follow-up without starting another thread; unrelated topics can start a new thread.
- Trade, machine model, measurements, available tools, materials and jurisdiction are requested progressively only when relevant.
- Avoid repeated questions when the answer is already in the conversation.
- Provide a clear error/retry state if a provider is unavailable. Never render a fake completed answer.

### Research transparency
When research runs, show a concise progress state such as "Checking technical sources" or "Comparing manufacturer information". On completion, display actual sources used. If no reliable sources were found, state that clearly.

## Screen 05 — KIVORA Answer and Voice Result

This is a result state within a consultation, not a separate mode.

### Answer hierarchy
1. Direct answer or short summary.
2. Explanation and key findings.
3. Relevant comparison or practical considerations where useful.
4. Evidence/source list with source identity, links and dates when available.
5. Uncertainty, applicability and safety limitations.
6. Useful next steps or suggested follow-up.

### Audio controls
- "Listen" action attached to the answer.
- Play, pause, resume and replay.
- Playback speed.
- Voice/language selection when supported.
- Loading, failed generation and retry states.
- Preserve text access when audio fails.
- Keep playback aligned to the answer shown; do not synthesize additional unreviewed claims.

The user should be able to listen to the useful explanation without needing to hear UI labels, raw URLs or long citation strings. The spoken version may say source/publisher names and explain where to find them.

## Screen 06 — Discover

**Goal:** Support curiosity and professional learning without requiring a current work problem.

### Initial discovery categories
- Machines and equipment
- Tools
- Materials and components
- Techniques and methods
- Products and systems
- New developments and practical knowledge

### Layout
- Search/discovery input.
- Category chips or filters.
- Editorial/curated collections only when content is real and reviewed.
- Relevant topics based on declared interests/trades, with a way to change filters.
- Clear content labels: guide, product information, manufacturer source, community post, reviewed knowledge.

### Interactions
- Open a knowledge detail.
- Save an item.
- Ask KIVORA about the item.
- Compare items when supported.
- Return to prior discovery position.

Do not launch with empty category pages or invented catalog entries. If content coverage is limited, make search and a small set of high-quality entries explicit.

## Screen 07 — Knowledge Detail

**Goal:** Let a worker explore a subject and turn discovery into deeper consultation.

### Content
- Clear title and short overview.
- Main explanation or structured guide.
- Relevant applications and limitations.
- Technical facts with source references.
- Related topics.
- Save action.
- "Ask KIVORA about this" action.
- Listen action when the detail content is suitable and speech is available.

Clearly distinguish publisher/manufacturer information, editorial explanation, AI synthesis and community contributions.

## Screen 08 — Professional Profile

**Goal:** Represent the worker's professional interests and voluntarily shared work.

### Private profile editor
- Display name and optional photo.
- One or more trades.
- Skills/specialties.
- Interests and areas they want to learn.
- Optional experience description.
- Optional broad location.
- Privacy controls for each public profile section.

### Public profile view
- Public professional summary.
- Trades and skills (self-described unless independently verified).
- Voluntarily published projects/posts/contributions.
- No private consultations, drafts, saved items or private activity.
- Do not show unverified credentials as certifications.

### Activity history
The account owner can review recent consultations, saved knowledge, their posts and contributions in private account views. Public profile activity only includes items explicitly shared.

## Screen 09 — Community

**Goal:** Help workers learn from other workers while remaining clearly secondary to KIVORA Intelligence.

### Feed filters
- Relevant / Following (only when following exists)
- Trade filters such as Furniture, Electrical, Plumbing, HVAC, Mechanical and Construction.

### Post types
- Practical tip
- Project showcase
- Question
- Discovery
- Tool/material experience
- Technique discussion

### Actions
- Like, comment, save, share and report.
- Create/edit/delete own post.
- Filter by trade or topic.

### Trust controls
- Mark posts as community contributions, not verified instructions.
- Report harmful or unsafe advice.
- Moderation and spam prevention.
- No automatic ingestion into trusted AI evidence.
- Private consultation messages cannot be turned into posts without explicit user action and preview.

## Screen 10 — Settings and account controls

**Goal:** Let users control identity, privacy and preferences.

- Account contact methods and verification.
- Session/device management and sign out.
- Account recovery and deletion.
- Privacy and data controls.
- Language and measurement preferences.
- Voice preference and playback speed.
- Saved knowledge/history controls.
- Optional wallet entry, visibly separate from AI access.
- Legal/privacy links.

## 3. Key end-to-end journeys

### Journey A — Visitor becomes a user
Public Home → Understand example → Sign up → Verify account → Optional trade/profile setup → Signed-in Home.

### Journey B — Simple consultation
Home → Ask KIVORA → Natural-language question → Direct answer → Optional listen → Follow-up or new conversation.

### Journey C — Research consultation
Home → Ask KIVORA → Question needing research → Real retrieval and source inspection → Evidence-aware explanation → Source links and limitations → Listen → Follow-up.

### Journey D — Learning without a problem
Home → Discover → Select machine/material/technique → Knowledge Detail → Save or Ask KIVORA → Return later.

### Journey E — Multiple independent topics
Ask KIVORA → Topic A thread → New consultation → Topic B thread → Recent conversations → Reopen either thread. No new workspace or account is created.

### Journey F — Professional identity and community
Profile → Add multiple trades/skills → Browse Community → Read a trade-relevant post → Comment or save → Voluntarily publish a project/tip → Contribution appears on profile only if public.

## 4. Mobile interaction and accessibility

- Design for Android phone viewport first.
- Keep primary actions reachable and labels visible.
- Use readable body text and sufficient contrast.
- Avoid dense multi-column desktop layouts on mobile.
- Preserve composer input during recoverable network failures.
- Support keyboard and touch interactions.
- Provide visible focus and accessible labels.
- Never rely on colour alone for trust, status or safety.
- Voice playback must not block scrolling or reading.
- Provide a text fallback for all audio-only interactions.

## 5. Design system direction

Use a clean, professional, calm visual system. The interface should feel like a trusted practical tool rather than a generic social app or trading dashboard.

- Strong information hierarchy and generous whitespace.
- Clear typography and concise labels.
- Neutral surfaces for reading technical content.
- Distinct but restrained styling for sourced facts, AI analysis, uncertainty and safety warnings.
- Consistent buttons and inputs.
- Avoid decorative cards that obscure the main consultation task.
- Keep the same visual language across public and authenticated experiences.

## 6. Launch acceptance checklist

- [ ] Visitor understands KIVORA before being asked to sign up.
- [ ] No workspace creation is shown.
- [ ] Account sign-up/sign-in uses only tested methods.
- [ ] Signed-in user lands on Home.
- [ ] Home offers immediate consultation and recent conversations.
- [ ] User can create and reopen multiple unrelated threads.
- [ ] Consultation does not require a job-intake form.
- [ ] Research state reflects real tool activity, not a fake animation.
- [ ] Sources and uncertainty are visible for research-backed answers.
- [ ] Listen control speaks the displayed answer and playback controls work.
- [ ] Private consultations never appear on public profile/community by default.
- [ ] Community is secondary in navigation and homepage hierarchy.
- [ ] Wallet is optional and does not gate AI access.
- [ ] Core mobile journeys pass on Android.
- [ ] No production deployment or paid provider activation without separate approval.
