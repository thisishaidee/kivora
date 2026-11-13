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
6. **Accessible by design.** Prioritise mobile workflows, voice and text, with graceful fallbacks for unreliable connectivity.
7. **Bitcoin is optional to the core product.** Any hackathon-required Bitcoin integration must not make ordinary AI access depend on a wallet.

## Current stage

Early product definition and validation. The repository begins with product and architecture documents; implementation choices remain subject to technical validation and user testing.

## Project documents

- [Product requirements](docs/PRD.md)
- [Architecture proposal](docs/ARCHITECTURE.md)
- [Decision log](docs/DECISIONS.md)

## Development status

No production-ready implementation is claimed by this repository yet. Provider choices, data storage, retrieval strategy, and Bitcoin/Lightning integration require validation before being treated as final.

## Security

Never commit API keys, access tokens, private keys, wallet seed phrases, user data, or production secrets. Use environment variables and server-side secret storage for credentials.

## License

No open-source license has been selected yet. Unless and until a license is added, all rights are reserved by the repository owner.
