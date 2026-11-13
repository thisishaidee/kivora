# Contributing to KIVORA

## Principles
- Keep the product multi-trade; do not hard-code a single-trade worldview.
- Separate shared workflow from trade-specific knowledge and safety rules.
- Never invent technical sources, model applicability, measurements or standards.
- Treat worker observations and AI hypotheses as unverified until reviewed.
- Do not add paid providers or services without explicit product-owner approval.
- Never commit secrets, wallet credentials, user media or private worker data.

## Development
- Use TypeScript strict mode.
- Validate untrusted input at boundaries.
- Keep provider integrations behind adapters.
- Add tests for safety gates, ownership checks and evidence applicability as those modules are introduced.
- Do not claim a feature is implemented unless it is present and tested.

## Pull requests
Describe the problem, scope, tests run, known limitations, security/privacy implications and any manual verification still required.
