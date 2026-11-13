# Contributing to KIVORA

KIVORA is in its foundation and validation phase. Contributions should improve practical usefulness, evidence quality, safety, accessibility or reliability.

## Before proposing a change

- Read the [product requirements](docs/PRD.md), [architecture](docs/ARCHITECTURE.md) and [decision log](docs/DECISIONS.md).
- Explain the real worker problem being addressed.
- Identify affected trades and whether the change is shared or trade-specific.
- Include evidence for technical claims.
- Describe safety implications and failure modes.
- State how the change can be tested on a mobile device.

## Technical expectations

- Do not hard-code provider credentials.
- Do not add paid services without explicit project approval.
- Prefer small, testable modules over premature service decomposition.
- Validate inputs and handle provider failures.
- Keep worker observations separate from verified technical facts.
- Never fabricate sources, product specifications or test results.
- Do not claim a feature works until it has been tested.

## Security

Never commit API keys, access tokens, private keys, seed phrases, passwords, production credentials or private user data. Use environment variables and server-side secret storage. If a secret is exposed, revoke or rotate it immediately; deleting it from the latest commit is not sufficient.

## Safety-critical changes

Any change affecting electrical, gas, pressure, structural, mechanical, vehicle or other high-risk work must document trade/hazard assumptions, required context and measurements, supporting evidence, missing-information and escalation behaviour, and tests for unsafe or incomplete inputs.

A disclaimer is not a substitute for a safety control.
