# Foundation and Wallet Status

This repository contains a mobile-first React/Vite interface, shared TypeScript/Zod contracts, a Cloudflare Worker health route, shell-only service-worker caching, automated tests and GitHub Actions CI.

## Implemented

- Trade selection across six skilled-worker fields plus multiple/unsure.
- English, Nigerian English, Nigerian Pidgin and French preference options.
- Metric and imperial measurement preference.
- Local task draft interface.
- API health endpoint.
- Static app-shell caching; API responses are not cached.
- Shared contract tests and Worker route tests.
- D1 SQL migration and security design for independent worker identities and private work sessions.
- NWC wallet panel: connection URI parsing, wallet information, balance display and receive-invoice creation when supported.
- Wallet connection URI is kept in component memory only and is not sent to the KIVORA API or stored persistently.
- Official hackathon requirements recorded.

## Not implemented or not yet verified

- Worker identity endpoints, authentication or private persistent sessions.
- D1 database binding or deployed database.
- AI model/provider integration or source retrieval.
- Voice input/output or image understanding.
- Compatibility assessment or trade-specific safety engine.
- Live NWC wallet interoperability test on Android.
- Outgoing Lightning payments.
- Production deployment.

The work-task continue action is intentionally a local placeholder. The form does not send or persist the worker's task. Do not present this as a functioning AI assistant.

## Verification

GitHub Actions runs TypeScript checking, unit tests and a production build. The foundation CI has passed all three checks. The wallet branch has its own CI runs; verify the latest branch run before merging. No deployment is claimed.
