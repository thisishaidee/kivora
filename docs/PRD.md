# KIVORA Product Requirements

> **Source of truth:** The current product definition, user journeys, screen map, launch priorities and product boundaries are maintained in [PRODUCT-BLUEPRINT.md](PRODUCT-BLUEPRINT.md). This PRD retains the underlying multi-trade, evidence, safety and validation requirements; where older job-first wording conflicts with the blueprint, the blueprint takes precedence.

**Tagline:** Know what to do next.  
**Category:** AI-powered practical intelligence for skilled workers.

## Product purpose

KIVORA helps skilled workers understand more, discover better ways of working, make informed decisions, develop their skills and solve unfamiliar practical problems. Workers can return to KIVORA even when they do not have an immediate job or fault to solve.

KIVORA Intelligence is the primary product. Consultation, research, reasoning and guidance work together in one experience. Discovery supports learning; professional identity helps personalize the product; community is secondary; wallet functionality is optional.

## Multi-trade scope

KIVORA supports multiple skilled-worker fields from the outset:
1. Carpentry and furniture making
2. Upholstery and interior-related work
3. Electrical work
4. Plumbing
5. HVAC and refrigeration
6. Mechanical and equipment repair
7. Construction and installation

A shared intelligence workflow must not imply shared technical conclusions. Each trade needs its own terminology, knowledge, standards, safety policies and verification requirements. A worker may have multiple trades.

## Consultation and research

Workers ask questions naturally. KIVORA determines whether a direct answer, source retrieval, deeper research, comparison or targeted clarification is appropriate. Users do not need to select a separate research mode.

The system should:
- Understand the question and intended outcome.
- Research manufacturer documentation and credible technical sources when useful.
- Inspect source content, applicability, date and limitations.
- Distinguish source-backed facts, worker observations, AI analysis/hypotheses and unknowns.
- Present understandable explanations, useful comparisons and practical next steps.
- Cite real sources and never fabricate references, specifications, prices or standards.
- Support multiple independent conversations under one personal account; a conversation is not assumed to be a job or workspace.
- Ask only for context necessary to answer accurately or safely.

## Text, image and voice

Text and images are supported input directions. Voice is a first-class product requirement:
- Spoken output for KIVORA responses, with play/pause/resume/replay and playback speed.
- Voice input with a visible, editable transcript before processing.
- Voice and text share the same context, evidence and safety pipeline.
- Text remains available if speech services fail.
- Speech providers must be benchmarked for technical terminology, Nigerian English and other target languages, latency, privacy and cost.

## Evidence and safety

KIVORA must distinguish:
- Manufacturer-confirmed facts and instructions.
- Applicable standards and regulatory material.
- Other credible technical references.
- Worker-provided observations and measurements.
- AI-generated hypotheses or interpretations.
- Reviewed outcomes.

Never fabricate sources, citations, product models, specifications, measurements or standards. Similar-model documentation is a lead, not proof of exact applicability.

High-risk areas include electrical systems, gas, pressurised equipment, heavy machinery, structural modifications, hazardous materials, vehicle safety and battery/power systems. Deterministic trade-specific safety controls must constrain generation and response validation. A disclaimer alone is not a safety system.

## Professional identity and community

Professional profiles may include multiple trades, skills, interests, experience and voluntarily shared projects/contributions. Private consultations remain private by default.

Community is a secondary feature for practical tips, projects, questions and discoveries. Community posts are user-generated and must not automatically become trusted technical evidence. Popularity is not proof of correctness.

## Wallet and payments

Bitcoin/Lightning is optional and never a prerequisite for account creation, consultation, discovery or community. Payment entitlements require independently verified backend events. No mainnet or real-fund functionality is enabled by this product definition.

## Validation

Interview workers about actual recent tasks and learning behaviour. Test whether KIVORA helps with unfamiliar machines, materials, tools, techniques and practical problems. Evaluate source relevance, factual correctness, safety, usefulness, voice quality, latency, mobile usability, return use and cost per consultation.

## MVP acceptance principles

- A visitor can understand KIVORA from a public homepage before signing up.
- A signed-in user lands on Home without creating a workspace.
- A user can start multiple independent consultations under one account.
- The AI can answer directly or research when appropriate without a separate research mode.
- Technical claims show real sources and limitations.
- Clarification is progressive, not a compulsory job-intake form.
- Results can be read and listened to.
- Trade-specific safety controls remain active.
- Wallet is not required for AI access.
- Unimplemented capabilities are clearly labelled and never simulated as working.
