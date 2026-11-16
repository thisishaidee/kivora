# KIVORA — Integrated Product Roadmap

**Purpose:** Keep the core skilled-worker product and the optional Bitcoin wallet moving together without allowing either workstream to distort the other.

## Product north star

**Know what to do next.**

KIVORA is AI-powered practical intelligence for skilled workers. The core product helps a worker understand an unfamiliar product, component, material, technique, equipment fault or job constraint; identify what is known and missing; retrieve applicable technical evidence; apply trade-specific safety boundaries; and decide on a safe, verifiable next step.

The wallet is a supporting, general-purpose financial tool and optional payment rail. It is not KIVORA's identity, and it is never a prerequisite for ordinary AI access.

## Core product workstream — always active

### Worker workflow and product experience
- Mobile-first Android/PWA experience.
- Private worker identity and work sessions.
- One practical work session holds text, images, voice transcripts, context, evidence and outcomes.
- Structured intake: task, trade(s), product/component/equipment, model, measurements, location/jurisdiction where standards matter, available tools/materials and constraints.
- Ask targeted questions when critical context is missing.

### Multi-trade practical intelligence
Initial trades remain carpentry/furniture, electrical, plumbing, HVAC/refrigeration, mechanical/equipment repair, and construction/installation. Use one shared workflow with distinct trade-specific terminology, knowledge, standards, safety rules and verification. Cabinet hardware and plumbing connections are initial deep demonstrations, not market limits.

### Evidence and trust
- Curated technical sources and passage-level provenance.
- Manufacturer/model applicability checks.
- Distinguish sourced facts, worker observations, AI hypotheses and reviewed outcomes.
- Compatibility: compatible, incompatible or undetermined.
- Never invent specifications, measurements, citations or standards.
- Similar-model documentation is a lead, not proof.

### Safety and verification
- Deterministic trade/hazard classification; multiple trades may apply and the most restrictive policy wins.
- Missing critical context triggers questions, bounded guidance or escalation.
- Model output cannot loosen safety controls.
- Validate evidence identifiers and prohibited steps after generation.
- Clear checkpoints and honest verification limits.

### Voice, image and field validation
- Text, image and voice share the same work context, evidence and safety engine.
- First voice release: push-to-talk, editable transcript and spoken response.
- Text fallback when speech or connectivity fails.
- Test Nigerian English, Nigerian Pidgin, French, technical terms, measurements and workshop noise.
- Validate actual recent jobs with independent workers; measure source applicability, unsafe/unsupported outputs and time-to-useful-next-step.

## Wallet workstream — parallel and independently gated

### Lightning
- NWC connection and Android interoperability.
- Wallet information and balance where supported.
- Receive invoices, QR and authoritative settlement status.
- Later: explicit-confirmation send flow, fees, timeout reconciliation and duplicate-payment protection.

### On-chain Bitcoin
- Vetted client-side wallet SDK and local key derivation/signing.
- 12-word BIP39 recovery and tested restore.
- Address generation and QR interoperability.
- Read-only chain synchronisation, complete HD address discovery, UTXOs, balance and history.
- Fee estimates and transaction preview.
- Testnet signing, broadcast and confirmation tracking only after recovery, UTXO and transaction validation.

### KIVORA payments
- Worker/customer/supplier payment requests and bookkeeping references.
- Subscriptions with backend-verified payment and idempotent entitlement transitions.
- Expert-service payment records.
- Rewards only for reviewed and accepted knowledge contributions.
- Keep protocol facts separate from KIVORA commercial records.

### Wallet release gates
- No seed phrase, private key or unrestricted NWC credential reaches KIVORA servers.
- No fake balances, fees, invoice settlement or payment confirmations.
- Testnet first.
- No mainnet, real-fund movement, paid service activation, custody, fiat conversion, escrow or automatic recurring debits without separate review and explicit approval.

## Shared operating rules
1. Work on both streams in parallel, but do not confuse their priorities.
2. Keep core worker intelligence, evidence, safety and validation active while wallet work proceeds.
3. Every implementation claim needs a passing build/tests and, where relevant, Android verification.
4. Maintain visible status for implemented, tested, blocked and deferred work.
5. Prefer small, independently reviewable changes and preview deployments.
6. Never merge a prototype into the main product merely because its UI works.
7. Record decisions and update the relevant roadmap when scope changes.

## Immediate priorities
1. Fix and verify testnet explorer connectivity through a narrow same-origin Cloudflare Pages Function; the direct browser request currently shows Failed to fetch.
2. Validate the proxy and address-scoped read-only balance/activity.
3. Expand on-chain discovery from one receive address to the BDK wallet's full supported address set and UTXO state before presenting a total wallet balance.
4. Keep the core product track active: audit the work-session experience against the PRD, then implement the next end-to-end evidence-backed worker workflow with trade classification, missing-context questions, source provenance and deterministic safety gates.
5. Add voice/image through the same core workflow after the evidence/safety path is testable.

Detailed acceptance criteria remain in the PRD, architecture and wallet requirement/roadmap documents.