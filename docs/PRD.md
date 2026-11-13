# KIVORA Product Requirements

**Tagline:** Know what to do next.  
**Category:** AI-powered practical intelligence for skilled workers.  
**Status:** Working product specification; validation is ongoing.

## Problem

Skilled workers encounter unfamiliar products, components, materials, techniques and faults. Finding information is only part of the challenge: workers need to know which information applies to their actual job, what context is missing, what risks matter and what can safely happen next.

## Product direction

KIVORA helps workers move from uncertainty to informed action using practical context, technical evidence and trade-specific intelligence.

It is not merely a repair chatbot, generic AI assistant, manual-search tool or one-trade app. It should understand the job, gather missing context, retrieve applicable technical evidence, assess requirements and risks, and provide understandable next steps with clear limitations.

## Multi-trade scope

KIVORA must support multiple skilled-worker fields from the outset:

1. Carpentry and furniture making
2. Electrical work
3. Plumbing
4. HVAC and refrigeration
5. Mechanical and equipment repair
6. Construction and installation

These are initial fields, not a permanent limit. Furniture and cabinet hardware may be one validation scenario, but must not define the product.

A shared intelligence workflow must not imply shared technical conclusions. Each trade needs its own terminology, knowledge, standards, safety policies and verification requirements.

## Core workflow

1. Understand the task and work situation.
2. Classify the trade and task.
3. Identify relevant products, components, materials or equipment.
4. Ask targeted questions to gather missing context.
5. Retrieve technical sources and relevant passages.
6. Evaluate source reliability, recency, model match and applicability.
7. Assess requirements, compatibility and risks.
8. Apply the relevant trade-specific safety gate.
9. Generate practical next steps and explain why they apply.
10. Guide suitable checkpoints.
11. Verify only what the available evidence can support.
12. Capture outcomes separately from unverified hypotheses.

## Input requirements

Text, voice and images should work together in one work session. Voice is a first-class requirement, not a separate intelligence path. Voice and text must share the same context, evidence and safety engine.

Initial voice experience: push-to-talk, visible/editable transcripts and spoken responses. Continuous hands-free conversation and live camera assistance can follow after the core workflow is reliable. Text fallback is required when speech services fail or connectivity is poor.

## Evidence and trust

KIVORA must distinguish:
- Manufacturer-confirmed facts and instructions.
- Applicable standards and regulatory material.
- Other credible technical references.
- Worker-provided observations and measurements.
- AI-generated hypotheses or interpretations.

Never fabricate sources, citations, product models, specifications, measurements or standards. A similar document is not proof that it applies to the identified model or job. User-submitted outcomes are not automatically authoritative; provenance and review are required before reuse as trusted knowledge.

## Safety

High-risk areas include electrical systems, gas, pressurised equipment, heavy machinery, structural modifications, hazardous materials, vehicle safety and battery/power systems.

The product must recognise hazards, ask relevant safety questions, avoid dangerous procedural guidance when context or qualification is insufficient, recommend qualified help when appropriate, and escalate when critical information is missing. Generic reasoning must never bypass trade-specific safety rules. A disclaimer alone is not a safety system.

## Candidate MVP scenarios

- **Carpentry:** identify an unfamiliar cabinet fitting, establish door/cabinet context, retrieve manufacturer installation information and compare it with the project.
- **Plumbing:** assess an unfamiliar pipe connection, establish material, dimensions and pressure requirements, and ask for missing information before recommending a procedure.
- **Electrical:** bounded, safe fault investigation and escalation without unsafe repair instructions.
- **HVAC:** identify equipment and symptoms, retrieve applicable manufacturer information and suggest only permitted next diagnostic steps.

Carpentry and plumbing are candidates for deeper end-to-end demonstrations. Electrical and HVAC should remain bounded by safety constraints. These scenarios do not narrow the product's multi-trade scope.

## MVP acceptance criteria

- Mobile-first text and image input; voice input/output in the planned initial experience.
- Appropriate trade/task classification.
- Targeted follow-up questions instead of guessing when critical information is missing.
- Retrieval of a real technical source and relevant passage.
- Clear explanation of source applicability or uncertainty.
- Compatibility result of compatible, incompatible or undetermined.
- Trade-specific safety controls and escalation.
- Understandable next steps with supporting evidence.
- Explicit confidence limits and honest verification.
- Worker observations kept separate from verified technical knowledge.

## Deferred

Defer full-depth knowledge coverage for every trade, 3D reconstruction, live video co-pilot, compliance certification, expert marketplace, rewards/reputation systems, large knowledge graph infrastructure and broad multilingual rollout until core reliability is demonstrated.

## Bitcoin and payments

Bitcoin/Lightning integration is a hackathon-related requirement and optional supporting capability, not a prerequisite for ordinary AI use. Potential later uses include expert payments or rewards for reviewed contributions. No simulated balances or payment confirmations; entitlements must follow verified payment events. Wallet and payment design remain undecided.

## Validation

Interview workers about actual recent jobs, not just whether they like the concept. Explore unfamiliar tasks, current workarounds, trusted sources, verification methods, time/material costs, frequency, AI trust, connectivity, language, device constraints and willingness to pay.

Current market research provides context but does not yet prove problem frequency or willingness to pay.
