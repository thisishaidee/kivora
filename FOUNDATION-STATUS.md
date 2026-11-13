# Foundation Status

This repository update establishes a mobile-first React/Vite interface, shared TypeScript/Zod contracts, a Cloudflare Worker health route, shell-only service-worker caching, initial automated tests and GitHub Actions CI.

## Implemented in this foundation

- Trade selection across six skilled-worker fields plus multiple/unsure.
- English, Nigerian English, Nigerian Pidgin and French preference options.
- Metric and imperial measurement preference.
- Local task draft interface.
- API health endpoint.
- Static app-shell caching; API responses are not cached.
- Shared contract tests and Worker route tests.
- Initial D1 SQL migration for worker identities, browser sessions and private work sessions.
- Security design for anonymous worker identity, one-time recovery codes and private session ownership.
- Official hackathon requirements recorded, including the mandatory Bitcoin/Lightning wallet submission component.

## Explicitly not implemented

- AI model/provider integration or source retrieval.
- Voice input/output or image understanding.
- Compatibility assessment or trade-specific safety engine.
- Live NWC wallet interoperability test on Android.
- Outgoing Lightning payments.
- Public application hosting and static asset deployment.
- AI model/provider integration or source retrieval.
- Voice input/output or image understanding.
- Compatibility assessment or trade-specific safety engine.
- Bitcoin/Lightning wallet integration.
- Production deployment.

The continue action is intentionally a local placeholder. The form does not send or persist the worker's task. Do not present this foundation as a functioning AI assistant.

## Verification

GitHub Actions runs TypeScript checking, unit tests and a production build. The first successful CI run validated the typecheck and production build; subsequent runs are checking the added test suite and schema documentation. Check the latest workflow result before treating the current branch as fully verified.

No deployment is claimed.
