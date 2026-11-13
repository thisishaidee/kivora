# Contributing to KIVORA

KIVORA is a multi-trade practical-intelligence platform. Contributions should improve real worker usefulness, evidence quality, safety, accessibility or reliability.

## Before proposing a change

- Read the [product requirements](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [decision log](docs/DECISIONS.md) and [implementation plan](docs/IMPLEMENTATION_PLAN.md).
- Explain the real worker problem being addressed.
- Identify affected trades and whether the change is shared or trade-specific.
- Include evidence for technical claims.
- Describe safety implications, missing context and failure modes.
- State how the change can be tested on a mobile device.

## Technical expectations

- Use TypeScript strict mode and validate untrusted input at boundaries.
- Keep provider integrations behind adapters.
- Prefer small, testable modules over premature service decomposition.
- Do not hard-code provider credentials or add paid services without explicit approval.
- Keep worker observations separate from verified technical facts.
- Never fabricate sources, product specifications, measurements, standards or test results.
- Do not claim a feature works until it has been tested.
- Keep ordinary KIVORA access independent of Bitcoin wallet ownership.

## Security

Never commit API keys, access tokens, private keys, seed phrases, passwords, production credentials or private user data. Use environment variables and server-side secret storage. If a secret is exposed, revoke or rotate it immediately; deleting it from the latest commit is not sufficient.

Private work-session queries must be scoped to the authenticated worker on every read and write. Never trust a worker ID supplied by the client. Never log cookies, recovery credentials, wallet secrets, raw media or private work content.

## Safety-critical changes

Any change affecting electrical, gas, pressure, structural, mechanical, vehicle or other high-risk work must document trade/hazard assumptions, required context and measurements, supporting evidence, missing-information and escalation behaviour, and tests for unsafe or incomplete inputs.

A disclaimer is not a substitute for a safety control.

## Tests and pull requests

Run:

    npm run typecheck
    npm run test
    npm run build

Pull requests should describe the problem, scope, tests run, known limitations, security/privacy implications and any manual verification still required.
