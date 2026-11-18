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

1. The current prototype still needs a coherent end-to-end consultation demonstration to qualify as a compelling MVP.
2. An optional NWC/NIP-47 Lightning wallet connection and receive-invoice flow has been implemented on a feature branch using the Alby SDK.
3. The wallet flow is receive-only: no outgoing payments, custody, seed phrase handling or simulated payment confirmations.
4. Real Android wallet/relay interoperability still needs a dedicated low-permission connection test before claiming the wallet flow is verified.
5. Preserve wallet-optional access to the core KIVORA work assistant.
6. Do not enable mainnet or real-fund features without separate security review and explicit release approval.
7. Reserve time for a public demo URL, a real end-to-end test, a short presentation/video and submission verification.

## Source links

- Challenge page: https://dakar-bitcoin-hack-2026.devpost.com/
- Rules page: https://dakar-bitcoin-hack-2026.devpost.com/rules
