# KIVORA Media Provider Evaluation

**Status:** R2 is enabled and a private preview bucket exists. The preview D1 schema and bucket bindings are provisioned, but uploads remain disabled. No AI provider has been activated and AI inference remains disabled.

## 1. Private media storage: Cloudflare R2

R2 is the leading storage candidate because KIVORA already runs on Cloudflare Workers and D1. Store private image/video objects in R2 and searchable ownership, conversation, retention and analysis metadata in D1.

### Account setup state

The user completed Cloudflare's R2 subscription onboarding. A Standard bucket named kivora-private-media now exists in WEUR. The bucket's managed r2.dev domain is disabled, no CORS policy is configured, and the bucket has no public access configured. A small write/read/delete health check succeeded and the test object was removed.

A separate EU-jurisdictioned D1 database named kivora-preview has all four repository migrations applied. Pages preview is configured with DB and MEDIA_BUCKET bindings to these isolated resources. The previous KIVORA_API service binding to the shared kivora Worker was removed from the Pages preview configuration. Production configuration was not changed.

The preview environment keeps MEDIA_UPLOAD_ENABLED=false and AI_ENABLED=false. Binding R2 does not expose uploads. The original kivora D1 database and production Worker were not migrated or modified.

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

Do not activate Clef-omni or any other paid model automatically. R2 setup has already been completed by the user, but storage usage beyond the published free allowance can be billed.

Before enabling user-facing media uploads or model inference:
1. Finish and verify the isolated Pages preview deployment against the preview D1 and R2 bindings.
2. Implement retention enforcement and a user-visible deletion path for original media and derived objects.
3. Define per-worker and global storage/request budgets, abuse protection and alerting; the current per-worker cap alone does not guarantee account-wide cost control.
4. Benchmark Clef-omni on representative KIVORA clips across trades, languages, workshop noise, camera movement, lighting and low-quality labels.
5. Measure token usage, latency, accuracy, uncertainty calibration and false identification rates.
6. Set daily/per-user model budgets, request ceilings, upload limits and retry rules.
7. Keep AI and media flags disabled until privacy, safety and cost tests pass.
8. Test physical Android, iPhone, tablet and desktop browsers before exposing the composer actions.

## 5. Decision

R2 + Clef-omni remains the leading Cloudflare-native candidate for a controlled multimodal prototype. R2 is provisioned for preview only; uploads are disabled. Clef-omni is not activated or approved for inference. No production resource or production deployment has been changed.
