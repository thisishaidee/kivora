# Intelligence foundation

**Status:** Deterministic orchestration and safety-triage foundation. This is not a connected AI assistant and does not yet retrieve manuals or generate technical procedures.

## Current boundary

The shared intelligence module accepts a structured work request and optional evidence records. It validates inputs, detects a bounded set of high-consequence hazards, asks for missing jurisdiction/equipment context, and filters evidence by trade, review state and exact model applicability.

A result can be:
- `clarify`: required context or reviewed applicable evidence is missing.
- `guided`: all required context is present and at least one reviewed source matches the selected trade and product applicability.
- `escalate`: a deterministic high-risk rule is triggered.

The compatibility result intentionally remains `undetermined`. A source being present is not, by itself, proof that two parts or products are compatible. A future compatibility assessor must evaluate the exact parts, dimensions, interfaces, ratings and manufacturer constraints and return explicit supporting evidence.

## Safety rules

The first rules cover live electrical work, gas leaks, pressure systems, structural members, work at height, rotating machinery, hazardous materials/confined spaces, vehicle safety and damaged lithium batteries. Rules are conservative triage, not exhaustive hazard coverage. High-risk classification blocks routine guidance; only short protective stop-work instructions are returned where a rule provides them.

This module is not a safety certification, a complete risk assessment, or a substitute for local law and competent professional judgement. Trade-specific packages must expand through reviewed rules and adversarial tests before real-world release.

## Evidence contract

Every evidence item records its publisher, title, trade, topic, retrieval timestamp, excerpt, review state and optional model applicability. Only reviewed items matching the selected trade and either being generic or matching the exact supplied model are returned as applicable evidence. This first version does not fetch, crawl or license any source automatically.

## Not yet implemented

- LLM/provider adapters or model calls
- Search, manual ingestion, OCR, retrieval or citations in the UI
- Real product/part compatibility assessment
- Image understanding, speech-to-text or text-to-speech
- Complete trade-specific hazard libraries
- Jurisdiction-specific code interpretation
- Worker validation or production release
