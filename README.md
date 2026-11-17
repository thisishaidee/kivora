# KIVORA

**Know what to do next.**

KIVORA is an AI-powered practical intelligence platform for skilled workers. It helps workers understand unfamiliar products, materials, components, equipment and techniques; investigate practical problems; and make better technical decisions using relevant evidence, practical context and trade-specific intelligence.

## Product principle

KIVORA helps skilled workers move from uncertainty to informed action. It should establish what the worker is trying to do, identify what is known and missing, find applicable technical evidence, account for trade-specific safety requirements, and explain suitable next steps.

KIVORA is not a generic repair chatbot, a manual-search wrapper, or a single-trade assistant.

## Multi-trade scope

The platform is designed for multiple skilled trades from the outset:

- Carpentry and furniture making
- Electrical work
- Plumbing
- HVAC and refrigeration
- Mechanical and equipment repair
- Construction and installation

These are initial fields, not a limit on future expansion. One shared workflow and intelligence foundation must use separate trade-specific technical knowledge, standards, terminology and safety policies.

## Product principles

1. **Context before conclusions.** Ask for critical missing details instead of guessing.
2. **Evidence before confidence.** Prefer applicable manufacturer information and credible technical sources; show provenance and limitations.
3. **Safety is part of reasoning.** Trade-specific safety controls must constrain guidance.
4. **Uncertainty must be visible.** Distinguish confirmed facts, observations, hypotheses and unknowns.
5. **Verification must be honest.** Never claim a result is verified beyond the evidence available.
6. **Accessible by design.** Support phones, tablets, laptops and desktop browsers equally; make text, voice and media workflows responsive, accessible and resilient to unreliable connectivity.
7. **Wallet-optional core access.** Bitcoin/Lightning is required for the current hackathon submission, but ordinary worker access to KIVORA must not require a wallet.

## Bitcoin Wallet

The Bitcoin Wallet is a general-purpose, wallet-optional product direction. Its full requirements, non-custodial technical architecture and staged delivery plan are documented here:

- [Wallet requirements](docs/WALLET-REQUIREMENTS.md)
- [Wallet architecture](docs/WALLET-ARCHITECTURE.md)
- [Wallet delivery roadmap](docs/WALLET-ROADMAP.md)
- [Wallet SDK evaluation](docs/WALLET-SDK-EVALUATION.md)

These documents do not enable mainnet or real-fund functionality. Testnet interoperability, security review and explicit release gates remain mandatory.

## Project documents

- [Product requirements](docs/PRD.md)
- [Architecture proposal](docs/ARCHITECTURE.md)
- [Decision log](docs/DECISIONS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Worker identity and private sessions](docs/WORKER_IDENTITY.md)
- [Worker validation plan](docs/VALIDATION_PLAN.md)
- [Dakar Bitcoin Hack requirements](docs/HACKATHON.md)
- [Foundation status and limitations](FOUNDATION-STATUS.md)

## Current implementation

The repository now contains a responsive React/Vite interface, shared TypeScript/Zod contracts, a Cloudflare Worker health route, shell-only service-worker caching, and initial automated tests. It is a development foundation, not yet a functioning AI assistant or production service.

### Local development

Requires Node.js 22 or newer.

    npm install
    npm run dev

### Checks

    npm run typecheck
    npm run test
    npm run build

## Current limitations

Worker identity and private work-session endpoints are implemented on the current feature branch and the D1 schema is provisioned in Cloudflare. The branch still needs CI, Worker deployment and end-to-end browser verification. AI providers, autonomous research and image/video understanding are not yet implemented. Private media upload APIs and metadata are implemented behind a disabled feature flag; no storage bucket is configured and no media upload is currently available to users. Initial on-device speech playback is available for the current deterministic preview assessment and response; speech-to-text, editable voice transcripts and a validated remote TTS provider are not yet implemented. Compatibility assessment and trade-specific safety enforcement remain partial and require further validation. The optional NWC wallet integration is being developed separately. See the implementation plan for the sequence and deployment gates.

## Security

Never commit API keys, access tokens, private keys, wallet seed phrases, passwords, production credentials or private worker data. Use server-side secret storage for provider credentials. KIVORA must never collect or store a worker's wallet seed phrase or private key.

## License

No open-source license has been selected yet. Unless and until a license is added, all rights are reserved by the repository owner.
