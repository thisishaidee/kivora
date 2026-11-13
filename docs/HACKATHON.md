# Dakar Bitcoin Hack — Submission Requirements

**Checked:** 13 November 2026  
**Official challenge:** https://dakar-bitcoin-hack-2026.devpost.com/  
**Official rules:** https://dakar-bitcoin-hack-2026.devpost.com/rules

## Deadline

The official Devpost page lists the submission deadline as **20 November 2026 at 20:00 UTC**, which is **21:00 in Lagos (WAT, UTC+1)**.

## Eligibility shown by the official pages

The rules page says participants should reside in Africa. The challenge page additionally says participants must be above the legal age of majority in their country of residence, students only, and excludes companies/professional organisations. Re-check the live pages before submission in case the organiser updates them.

## Required submission elements

The challenge page specifies:
- A brief presentation (text or video).
- A prototype, MVP or proof of concept.
- At least one Bitcoin or Lightning wallet implementation.

The rules page also requires a public GitHub repository and an MVP accessible online or a demo video.

**Important product distinction:** KIVORA's ordinary AI workflow should remain usable without a Bitcoin wallet. The hackathon submission nevertheless needs a genuine Bitcoin/Lightning wallet implementation. These are compatible requirements: integrate a real wallet capability into the hackathon MVP without making wallet ownership a gate for ordinary worker access.

## Judging emphasis

The official challenge page highlights usefulness and local impact, security by design, UX/UI quality, a working MVP, and a clear pitch. It asks for a three-minute demo and documentation covering setup, architecture, constraints, metrics and next steps.

## KIVORA delivery implications

1. The current application scaffold is not yet a qualifying MVP by itself.
2. A real, testable Bitcoin/Lightning wallet integration is a required submission workstream, not a nice-to-have.
3. Do not simulate balances, invoices, payments or confirmations.
4. Do not store seed phrases or private keys on KIVORA servers.
5. Choose a wallet integration only after reviewing custody, permissions, recovery, Android/browser support, testability and security.
6. Preserve wallet-optional access to the core KIVORA work assistant.
7. Reserve time for a public demo URL, a real end-to-end test, a short presentation/video and submission verification.

## Source links

- Challenge page: https://dakar-bitcoin-hack-2026.devpost.com/
- Rules page: https://dakar-bitcoin-hack-2026.devpost.com/rules
