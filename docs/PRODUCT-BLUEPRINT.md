# KIVORA Product Blueprint

**Status:** Product direction aligned; implementation specification for the three-day launch plan  
**Brand line:** Know what to do next.  
**Product category:** AI-powered practical intelligence for skilled workers.

## 1. Product definition

KIVORA helps skilled workers understand more, discover better ways of working, make informed decisions, develop their skills and solve unfamiliar practical problems.

KIVORA is a place workers can return to even when they do not have an immediate job or fault to solve. They may want to understand a machine, compare tools, learn a material, research a technique, explore a new development, ask a professional question or learn from another worker.

KIVORA is not:
- A generic chatbot with a trade-themed interface.
- A repair-only assistant.
- A job-intake form or collection of workspaces.
- A manual-search wrapper that returns unexamined links.
- A social network whose engagement feed is the main product.
- A wallet product that requires cryptocurrency knowledge.

**Product promise:** Help workers move from uncertainty to understanding and informed action.

## 2. Audience and scope

KIVORA is multi-trade from the outset. Initial professional areas:
1. Carpentry and furniture making
2. Upholstery and interior-related work
3. Electrical work
4. Plumbing
5. HVAC and refrigeration
6. Mechanical and equipment repair
7. Construction and installation

The list is extensible. Trade profiles can include more than one trade and related skills. A worker must not be forced to choose a single trade to use general consultation or discovery.

The product should work for independent workers, technicians, installers, makers and other skilled professionals. It should be approachable to people with no prior AI, crypto or Web3 experience.

## 3. Product hierarchy

### Primary: KIVORA Intelligence

The central product. A worker asks naturally; KIVORA understands, decides whether research is needed, investigates when appropriate, analyses the available evidence, explains the result and guides useful next steps.

Research is integrated into consultation. There is no separate research mode the worker must remember to activate.

### Supporting: Discovery

A way to explore useful practical knowledge without first having a problem. Initial topics include machines, tools, materials, components, products, techniques, methods and relevant developments. Discovery should lead naturally into a consultation or a saved item.

### Supporting: Professional identity

A professional profile records a worker's trades, skills, interests and voluntarily shared experience. It helps personalize discovery and organize professional activity. It does not restrict what the worker can ask.

### Secondary: Community

A trade-focused place to share projects, practical tips, questions, discoveries and professional experiences. It supports the main goal but is not the product's centre of gravity. Community content is user-generated and must never be presented as verified technical instruction merely because it is popular or highly rated.

### Optional: Wallet and payments

Wallet functionality is separate and optional. No wallet, Bitcoin, Lightning or Web3 knowledge is required for account creation, consultation, discovery or community participation. Wallet work remains testnet-only until separate security and release gates are met.

## 4. Core intelligence experience

### One unified intelligence system

The worker does not choose between chat, research, investigation or analysis. KIVORA determines the appropriate depth and tools from the request.

- Simple, stable question: answer directly and clearly.
- Technical or unfamiliar subject: research trustworthy technical sources where useful.
- Product or machine comparison: compare applicable specifications, use cases and limitations.
- Current or changing information: retrieve current sources and show dates.
- Complex practical problem: gather relevant context, research causes and options, and ask targeted clarifying questions.
- Safety-critical request: apply the relevant trade policy before providing guidance; escalate or bound the answer when required.

The system should not conduct unnecessary research for every trivial question, but it must not bluff when research is needed.

### Research workflow

1. Understand the user's actual question and intended outcome.
2. Decide whether retrieval or external research is needed.
3. Search relevant manufacturer documentation, standards/regulatory material where appropriate, and credible technical sources.
4. Inspect source content rather than relying only on snippets.
5. Check date, source quality, exact product/model applicability and limitations.
6. Compare and synthesise findings; distinguish source facts from KIVORA's analysis and hypotheses.
7. Apply trade-specific safety and uncertainty controls.
8. Present a useful answer with citations/source links and practical implications.
9. Suggest a sensible next question or action without forcing a workflow.
10. Allow the user to ask follow-ups in the same conversation.

Never invent sources, specifications, prices, standards, test results or model compatibility. If reliable evidence is unavailable, say what is unknown and what would resolve it.

### Result presentation

A research-backed response can include:
- A short direct answer.
- A clear explanation in worker-friendly language.
- Key findings and comparisons.
- Practical applications and limitations.
- Evidence/source links with publisher and date where available.
- What is known, uncertain or only a hypothesis.
- Safety considerations and when qualified help is needed.
- Useful next steps and follow-up questions.

Not every answer needs every section. The interface should adapt to the question rather than display a rigid report template every time.

### Voice: text and audio together

Voice output is a first-class part of the result. Users can read or listen to KIVORA's explanations. A result should have a clear listen/play control and usable playback controls: play, pause, resume, replay and playback speed. Where supported, users can choose voice and language. Audio should follow the same answer and safety policy as text; speech must not add claims absent from the visible answer.

Voice input is also part of the product direction: push-to-talk, visible editable transcript, then the same intelligence pipeline as typed input. The initial launch may prioritize spoken output if time/provider constraints prevent reliable input, but the architecture must not split voice from the core intelligence system.

Speech services are selected separately from the reasoning model when that yields better quality. Benchmark language/accent performance, technical vocabulary, latency, privacy, reliability and cost. Do not activate paid providers without budget verification and explicit approval. Browser speech synthesis may be a fallback, not the only planned voice strategy.

## 5. User journeys and account model

### Public visitor journey

1. Visitor lands on the public KIVORA homepage.
2. Understands the purpose, who it helps and what it can do.
3. Sees concrete examples of consultation, research and spoken results.
4. Can browse public-facing introductory/discovery content and public community previews where available.
5. Signs up when they want personal consultations, saved history, posting, commenting or profile features.

Do not require account creation merely to understand the product. Public browsing depth can be limited to protect private or licensed content.

### Account and sign-in

The product uses a personal account, not a user-created workspace. Account identity persists across devices and sessions.

Desired entry options: email sign-up/sign-in and phone-number sign-up/sign-in. Select the actual authentication provider only after checking verification, account recovery, abuse controls, privacy, Nigeria/international SMS delivery, pricing and Cloudflare compatibility. Do not promise both channels until implemented and tested. A secure email-first launch is preferable to shipping unreliable phone OTP; phone can follow if provider and cost checks pass.

Account requirements:
- Verified contact method.
- Secure session cookies and logout.
- Account recovery and contact-change verification.
- Account deletion and data export/retention policy.
- Rate limits and abuse controls.
- No public exposure of private consultation history.

### Signed-in first experience

The first signed-in screen is Home. It should help a worker start a consultation immediately, continue recent conversations, discover useful knowledge and see relevant professional activity. It must not ask them to create a workspace or complete a long job form.

### Multiple conversations

A user has one account and can start many independent conversations about unrelated subjects. Each conversation has its own title, history and optional saved state. A conversation is not assumed to be a job, project or formal investigation. The user can return to prior conversations, start a new one at any time and switch topics without losing context.

Ask only for details relevant to the current question. Trade, jurisdiction, model, measurements, materials and tools are optional context unless needed for accuracy or safety. Progressive clarification replaces mandatory intake.

## 6. Screen map

The following are major screen groups, not necessarily separate routes. Mobile navigation should remain simple.

### Public screens
1. **Public Home** — KIVORA's purpose, benefits, examples, trade coverage, voice/research demonstration and sign-up entry.
2. **Sign up / Sign in / Recovery** — verified email and/or phone authentication based on provider readiness; accessible recovery.

### Signed-in application
3. **Home** — primary consultation entry, recent conversations, relevant discoveries and helpful activity.
4. **Ask KIVORA** — conversation interface, attachments/context when relevant, follow-ups, research status, source-backed result and listen controls.
5. **Discover** — browse/search machines, tools, materials, products, techniques and practical knowledge.
6. **Knowledge Detail** — a discovery/research item with explanation, sources, limitations, related topics, save and ask-KIVORA actions. This may be a view within Discover rather than a standalone route.
7. **Professional Profile** — trades, skills, interests, experience, projects/posts, public contributions and profile privacy.
8. **Community** — trade filters, posts, questions, comments, likes and saves; secondary navigation and not the default home feed.
9. **Settings** — account/contact methods, privacy, language/units, voice preferences, saved data, sessions and optional wallet entry.

### Navigation recommendation

Primary navigation: **Home · Ask KIVORA · Discover · Profile**. Community is reachable from Discover or a secondary navigation item. Settings is accessible from the profile/account menu. The public homepage has a clear sign-up/sign-in action.

### Home screen content priority

1. Prominent invitation to ask KIVORA, with a natural-language prompt.
2. Continue recent conversations.
3. Relevant practical discoveries and learning suggestions.
4. Useful community highlights only as a secondary module.
5. Clear access to Discover and profile.

Avoid a cluttered dashboard, compulsory onboarding questionnaire or community-first feed.

## 7. Professional profiles and privacy

Profile fields can include:
- Display name and profile image (optional).
- Primary and additional trades.
- Skills, specialties and interests.
- Experience level or years of experience (optional and self-described).
- Location at an appropriately broad level (optional).
- Voluntarily shared projects, posts and contributions.
- Saved knowledge and private consultation history remain private by default.

A user must control which profile fields and contributions are public. Private AI conversations must never automatically appear on a public profile or community feed. Do not imply credentials or certifications that have not been verified.

## 8. Community rules and trust

Community post types may include practical tip, project showcase, question, discovery, tool/material experience and technique discussion. Trade filters help workers find relevant content. Provide reporting, moderation and spam controls before broad public access.

Keep distinct trust labels for:
- Community contribution (user-generated, not verified).
- Source-backed reference (published by an identifiable source).
- Reviewed technical knowledge (reviewed under a documented process).

Likes, comments, popularity and author profile do not establish technical correctness. Community content cannot enter the trusted AI evidence corpus automatically.

## 9. Evidence, safety and quality controls

- Multi-trade classification may return multiple trades; the most restrictive applicable safety policy wins.
- Separate sourced facts, worker observations, AI hypotheses and reviewed outcomes.
- Compatibility states: compatible, incompatible or undetermined.
- Exact model evidence applies only to that model; similar-model material is a research lead, not proof.
- A pre-generation gate determines allow, clarify, bounded guidance or escalation.
- Model output cannot relax deterministic safety policy.
- Validate cited evidence identifiers and claim/source relationships after generation.
- Jurisdiction-specific standards require a known jurisdiction and applicable source.
- Do not provide dangerous procedural guidance where context, qualification or evidence is insufficient.
- Essential safety guidance must not be paywalled.

## 10. Wallet boundary

Wallet is an optional, separate capability and must not dominate onboarding or navigation. Do not request a wallet connection to use KIVORA AI. Existing wallet prototypes remain isolated/testnet-only until separately reviewed. No mainnet, real-fund movement, paid subscription activation or automatic billing is authorised by this blueprint.

## 11. Launch scope and sequencing

### Must prioritize for the three-day launch window
1. Public homepage that accurately explains KIVORA.
2. Account model and secure sign-in path; do not fake phone/email support.
3. Signed-in Home without workspace creation.
4. Multiple independent consultation threads under one account.
5. Natural-language consultation UI with progressive clarification.
6. A real research-capable AI path only after provider, source retrieval, cost and safety checks.
7. Source-aware answer rendering and honest limitation states.
8. Read-aloud response experience with real or clearly identified fallback speech.
9. Mobile-first responsive layout and reliable persistence.
10. Safety gates and privacy boundaries retained.

### Build after the core path or as capacity allows
- Full discovery catalogue and editorial content system.
- Rich professional profiles and project portfolios.
- Community posting, comments and moderation at scale.
- Broad multi-language speech support.
- Advanced image understanding and live camera.
- Wallet payments, paid plans, expert marketplace and rewards.

A screen can be designed before all its backend capabilities exist, but the interface must clearly distinguish working functionality from preview/placeholder content.

## 12. AI and speech provider selection

Do not select a provider based on brand popularity alone. Benchmark candidate models on a fixed KIVORA evaluation set across:
- Technical accuracy and source-grounded reasoning.
- Research/tool-use quality and citation integrity.
- Multi-turn consultation and context retention.
- Safety behaviour on high-risk and underspecified prompts.
- Nigerian English and technical terminology.
- Latency and cost per typical consultation.
- Data handling, retention and regional/legal constraints.
- Cloudflare Worker integration and operational reliability.

Evaluate speech separately for naturalness, pronunciation of model numbers/measurements, language/accent support, latency, audio quality, price and privacy. Keep provider adapters so models/services can be changed without redesigning the product.

No paid API usage until account billing and estimated spend are verified and the user explicitly approves.

## 13. Success measures

Measure product usefulness, not vanity engagement:
- Time from opening KIVORA to starting a useful consultation.
- Percentage of questions resolved without unnecessary clarification.
- Source relevance and citation correctness.
- Worker-rated usefulness and clarity.
- Safety gate precision and escalation quality.
- Voice playback starts/completion and speech quality feedback.
- Return use for learning/discovery as well as practical problems.
- Consultation retention and successful recovery across devices.
- Discovery-to-consultation conversion.
- Community contribution quality, not just likes or post volume.

## 14. Open implementation decisions

These require technical evaluation, not more product-vision discussion:
- Authentication provider and verified email/phone rollout.
- AI reasoning/research model and search/retrieval providers.
- Speech generation and speech recognition providers.
- Source licensing, indexing and refresh process.
- Exact launch trade depth and reviewed evidence corpus.
- Data retention, privacy notice and jurisdiction-specific launch requirements.
- Usage limits and sustainable operating cost.

These choices must be documented with evidence and trade-offs. Do not silently convert a hypothesis into a product commitment.
