# KIVORA

**Know what to do next.**

KIVORA is an AI-powered practical intelligence platform for skilled workers. It helps workers understand unfamiliar products, materials, components, equipment and techniques; investigate practical problems; and make better technical decisions using relevant evidence, practical context and trade-specific intelligence.

## Product direction

The canonical, current product direction is documented in:
- [KIVORA Product Blueprint](docs/PRODUCT-BLUEPRINT.md)
- [Existing Implementation Audit](docs/IMPLEMENTATION-AUDIT.md)

KIVORA is a place skilled workers can return to for consultation, research, learning and practical discovery, even when they do not have an immediate job to solve. KIVORA Intelligence is the primary product. Research is integrated into consultation when useful, and results should be available as readable text and spoken audio.

The product starts with a public homepage and personal accounts, not workspace creation. Discovery supports the core intelligence experience. Community is secondary. Wallet access is optional and never required for ordinary AI use.

## Multi-trade scope

The platform is designed for multiple skilled-worker fields from the outset:

- Carpentry and furniture making
- Upholstery and interior-related work
- Electrical work
- Plumbing
- HVAC and refrigeration
- Mechanical and equipment repair
- Construction and installation

These are initial fields, not a limit on future expansion. One shared intelligence foundation must use separate trade-specific technical knowledge, standards, terminology and safety policies.

## Product principles

1. **Useful before elaborate.** Let workers ask naturally; do not force a job form or workspace before they can get help.
2. **Evidence before confidence.** Prefer applicable manufacturer information and credible technical sources; show provenance and limitations.
3. **Safety is part of reasoning.** Trade-specific safety controls must constrain guidance.
4. **Uncertainty must be visible.** Distinguish confirmed facts, observations, hypotheses and unknowns.
5. **Verification must be honest.** Never claim a result is verified beyond the evidence available.
6. **Accessible by design.** Prioritise mobile workflows, voice and text, with graceful fallbacks for unreliable connectivity.
7. **Wallet-optional core access.** Bitcoin/Lightning must never be required for ordinary worker access to KIVORA.

## Bitcoin Wallet

The Bitcoin Wallet is an optional, separately staged product capability. Its requirements and security boundaries are documented in:
- [Wallet requirements](docs/WALLET-REQUIREMENTS.md)
- [Wallet architecture](docs/WALLET-ARCHITECTURE.md)
- [Wallet delivery roadmap](docs/WALLET-ROADMAP.md)
- [Wallet SDK evaluation](docs/WALLET-SDK-EVALUATION.md)

These documents do not enable mainnet or real-fund functionality. Testnet interoperability, security review and explicit release gates remain mandatory.

## Project documents

- [Product blueprint](docs/PRODUCT-BLUEPRINT.md)
- [Implementation audit](docs/IMPLEMENTATION-AUDIT.md)
- [Product requirements](docs/PRD.md)
- [Architecture proposal](docs/ARCHITECTURE.md)
- [Decision log](docs/DECISIONS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Worker identity and private sessions](docs/WORKER_IDENTITY.md)
- [Worker validation plan](docs/VALIDATION_PLAN.md)
- [Dakar Bitcoin Hack requirements](docs/HACKATHON.md)
- [Foundation status and limitations](FOUNDATION-STATUS.md)

## Current implementation

The repository contains a mobile-first React/Vite application, shared TypeScript/Zod contracts, Cloudflare Worker/Pages functionality, private session foundations and automated tests. The implementation audit describes what is implemented, what remains unverified and what needs redesign.

It is a development foundation, not yet a functioning end-to-end research-capable AI product. Do not imply that AI inference, reviewed evidence retrieval, voice services, or account authentication are working until implemented and tested.

### Local development

Requires Node.js 22 or newer.

    npm install
    npm run dev

### Checks

    npm run typecheck
    npm run test
    npm run build

## Security

Never commit API keys, access tokens, private keys, wallet seed phrases, passwords, production credentials or private worker data. Use server-side secret storage for provider credentials. KIVORA must never collect or store a worker's wallet seed phrase or private key.

## License

No open-source license has been selected yet. Unless and until a license is added, all rights are reserved by the repository owner.
