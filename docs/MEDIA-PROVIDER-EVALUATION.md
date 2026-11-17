# KIVORA Media Provider Evaluation

**Status:** Candidate assessment only. No provider has been activated, no R2 bucket exists, and AI inference remains disabled.

## 1. Private media storage: Cloudflare R2

R2 is the leading storage candidate because KIVORA already runs on Cloudflare Workers and D1. Store private image/video objects in R2 and searchable ownership, conversation, retention and analysis metadata in D1.

### Account setup state

The connected Cloudflare account currently has R2 disabled. The account API returns an instruction to enable R2 through the Cloudflare Dashboard. Cloudflare's onboarding flow requires adding an R2 subscription through its dashboard checkout before using R2.

No bucket has been created and no subscription/checkout has been completed.

### Published Standard storage allowance and rates

- Monthly included usage: 10 GB-month storage, 1 million Class A operations and 10 million Class B operations.
- Standard storage above the included allowance: $0.015 per GB-month.
- Class A operations above the included allowance: $4.50 per million.
- Class B operations above the included allowance: $0.36 per million.
- Internet egress: no charge.

Use Standard storage for active conversation media. Avoid Infrequent Access for this workload because it has retrieval charges and a minimum storage duration. Apply lifecycle expiration and enforce per-worker quotas before enabling uploads.

These are published rates, not a prediction that KIVORA will remain within the free allowance. Actual usage must be metered.

## 2. Multimodal analysis candidate: Cloudflare Workers AI Clef-omni

**Candidate model:** `@cf/cloudflare/clef-omni`

Reasons to benchmark:
- Accepts text, images, audio and video in one model request.
- Video frames and soundtrack can be interpreted together.
- Cloudflare lists zero data retention for the model.
- It returns typed decisions/probabilities rather than a free-form explanation. KIVORA should use it to extract structured visual/audio observations, then pass those observations through deterministic trade safety and evidence checks before composing a worker-friendly answer.

### Published input limits

- Up to 2 video clips per request.
- Each video: maximum 16 MiB decoded and 60 seconds.
- Video sampling: 2 frames per second.
- Video formats documented: MP4 and WebM.
- Audio/video combined decoded size: maximum 16 MiB.
- A video's soundtrack is included when every video in the request has one.
- Up to 4 standalone audio clips, each maximum 8 MiB and 300 seconds.
- Up to 4 images, PNG/JPEG/WebP, each maximum 4 MiB and 16 megapixels.

KIVORA's current upload API permits larger videos and QuickTime uploads. Those files must not be sent directly to this model. Before any model call, KIVORA must validate duration/container and create a compliant analysis rendition or reject the analysis request with a clear explanation. The original remains private. Do not silently transcode or discard audio.

### Published model price and indicative input cost

The model page lists $0.15 per million input tokens and no output-token charge. Video input can consume up to approximately 15,400 tokens per minute at maximum resolution, plus approximately 780 tokens per minute when sound is present. At that upper-bound token rate, a minute of video with sound is roughly $0.00243 in model input cost. This is an indicative calculation from published token rates, not a usage guarantee; resolution, duration, frame content and actual tokenization change the cost.

This model is not free. Workers AI's general free allocation must not be assumed to make every model-specific unit charge free. Enforce a per-worker daily budget and a per-request ceiling before enabling it.

## 3. Proposed analysis contract

For each image/video, ask the model a bounded set of typed questions and map its output into a server-owned result schema:

- Visible object/component observations.
- Label/model/serial text visibility (not assumed to be readable).
- Observable movement or sequence with timestamps.
- Audible observations only when audio was present and analysed.
- Potentially relevant safety signals.
- Uncertainty and missing views.
- Explicit "not visible / cannot determine" outcomes.

The model's answer is an observation/hypothesis layer, not verified technical evidence. It cannot establish product compatibility, safe operating conditions, legal compliance or a final fault diagnosis by itself. Approved manufacturer documentation and the existing deterministic safety gate remain authoritative.

## 4. Provider activation and release gates

Do not activate R2, Clef-omni or any other paid model automatically.

Before enabling:
1. Obtain explicit approval to enable the R2 subscription and create a private bucket.
2. Create and bind a private bucket; verify no public access is configured.
3. Apply the media metadata migration to the intended non-production database only.
4. Benchmark Clef-omni on representative KIVORA clips across trades, languages, workshop noise, camera movement, lighting and low-quality labels.
5. Measure token usage, latency, accuracy, uncertainty calibration and false identification rates.
6. Set daily/per-user cost caps, upload limits, retention, deletion and retry rules.
7. Keep AI and media flags disabled until privacy, safety and cost tests pass.
8. Test physical Android, iPhone, tablet and desktop browsers before exposing the composer actions.

## 5. Decision

R2 + Clef-omni is the leading Cloudflare-native candidate for a controlled multimodal prototype. It is not yet an approved production architecture or active service. No resource provisioning, model invocation, billing change or production deployment has been performed.
