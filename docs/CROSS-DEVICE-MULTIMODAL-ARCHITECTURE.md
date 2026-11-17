# KIVORA Cross-Device and Multimodal Architecture

**Status:** Implementation architecture and acceptance requirements. This document does not claim that media upload, vision, video understanding, or cross-device QA is already shipped.

## 1. Product-wide device commitment

KIVORA is a responsive web product, not an Android application with desktop support added later. Android, iPhone, tablets, laptops and desktop browsers are first-class targets.

### Supported experience

- **Phones:** Android and iPhone, portrait and landscape; touch-first controls, camera capture, gallery/library selection, file selection, voice input/output where supported.
- **Tablets:** iPadOS and Android tablets, portrait and landscape; use available width without stretching reading lines or making controls awkward.
- **Desktop/laptop:** current supported Chrome, Edge, Firefox and Safari releases; keyboard navigation, pointer interaction, drag/drop where useful, file picker, webcam/microphone permission flows where supported.
- **Assistive technology:** semantic controls, screen-reader labels, visible focus, zoom/reflow, reduced motion, captions/transcripts and text alternatives.

Support is feature-detected. Never infer that a feature works merely because the browser identifies as a particular device. If camera, microphone, codec, speech synthesis or speech recognition is unavailable or permission is denied, preserve a useful text/file alternative and explain the limitation.

### Responsive layout rules

- Start with content and interaction constraints, not device names or a single fixed breakpoint.
- No horizontal page scrolling at 320 CSS px; support zoom and text reflow.
- Use fluid containers with a readable conversation column and wider multi-column layouts only when there is room.
- Do not stretch technical answer text across the full desktop viewport.
- Keep composer controls reachable at narrow widths and when the virtual keyboard is open.
- Respect safe areas on notched phones and avoid controls behind browser chrome.
- Do not make hover the only way to discover or operate an action.
- Use touch targets of at least 44 by 44 CSS px for primary interactive controls; keyboard focus must be equally visible.
- Support pointer, touch, keyboard and assistive technology without separate product behaviour.
- Avoid fixed heights for content, cards and answer panels. Long conversations must scroll naturally.
- Persist no assumption that a mobile browser has a physical camera, microphone or a particular codec.

## 2. Unified conversation media model

Text, voice, images and video are different ways of providing context to the same conversation. They must enter the same identity, ownership, evidence, trade-classification and safety pipeline.

A conversation message may contain:
- Text supplied by the worker.
- One or more image attachments.
- One or more video attachments.
- Audio or an editable speech transcript when speech input is implemented.
- System-generated media analysis linked to the original attachment and its provenance.

The UI must make clear which media has uploaded, which is still processing, which failed, and which has actually been analysed. A local preview is not an upload. An upload is not an analysis result.

### Worker experience

The composer should provide distinct, accessible actions:
- **Take photo** — request camera capture where supported.
- **Upload image** — choose an existing image from photo library or files.
- **Record video** — request camera/video capture where supported.
- **Upload video** — choose an existing video from files or media library.
- **Add text** — optional context or question; media-only questions must remain possible when safe and technically supported.

Use native browser file inputs and capability detection rather than platform-specific assumptions. On mobile, a camera capture hint may be offered, but it is not guaranteed to launch a camera on every browser. On desktop, use a file picker and optionally a tested webcam capture flow. Never block the worker if a capture path is unavailable.

Before sending, show local thumbnails/posters, filenames, media type and size, with remove/replace controls. Show upload progress and retry for recoverable failures. Allow multiple images and a bounded number of videos according to configured product limits. Explain limits before upload. Do not silently discard selected media.

## 3. Secure media storage and lifecycle

Media is private to its owner and conversation. Public object URLs and guessable storage keys are prohibited.

### Upload lifecycle

1. Authenticate the worker using the established session.
2. Verify that the target conversation exists and belongs to that worker.
3. Create a short-lived upload intent with a random, unguessable media ID and a server-generated object key.
4. Enforce configured per-file, per-message, per-account and rate limits before accepting bytes.
5. Upload to private object storage using a bounded streaming or short-lived upload mechanism. Do not base64-encode media into JSON or store binary blobs in D1.
6. Validate actual file signatures, declared MIME type, byte count, dimensions/duration and supported codecs. Never trust the filename or browser MIME declaration.
7. Reject active content (including SVG/HTML), malformed files, decompression bombs and unsupported formats. Normalize/strip EXIF and location metadata from images where technically safe; do not alter the original without making the transformation clear.
8. Finalize the upload only after server-side validation. Store metadata and ownership in D1.
9. Return only an authenticated application reference, never a permanent public bucket URL.
10. Authorize every read, analysis request and delete against both worker ownership and conversation ownership.

### Storage and metadata

A private object store such as Cloudflare R2 is the current leading candidate, not yet provisioned or approved as an active dependency. D1 should store metadata, not media bytes. Metadata should include:

- Random media ID and opaque object key.
- Worker ID and conversation ID.
- Media kind, validated MIME type, byte size and checksum.
- Image dimensions or video duration/dimensions/codec where available.
- Created, uploaded, processing, failed and deleted timestamps/status.
- Optional worker caption and consent/processing state.
- Retention expiry and deletion state.

Do not expose object keys, storage credentials or provider secrets to the browser.

### Retention, deletion and consent

- Define and disclose retention before enabling uploads.
- Delete media when the worker deletes the attachment or conversation, subject to a documented recovery window if one exists.
- Account deletion must remove or schedule deletion of all owned media and derived media artifacts, not only D1 rows.
- Failed uploads and abandoned upload intents must expire automatically.
- Derived thumbnails, extracted frames, audio tracks, transcripts and embeddings inherit the original media's privacy and retention rules.
- Do not use worker media to train provider models unless a separate, explicit opt-in is designed and approved.
- Log access and deletion events without logging media contents, signed URLs or secrets.

## 4. Image understanding

The image pipeline should:
- Accept only validated formats within configurable byte and pixel limits.
- Preserve the original privately while creating bounded analysis renditions when needed.
- Identify visible objects, components, labels, connections, damage or relevant visual details only when actually discernible.
- Read labels/model markings only when image quality permits; ask for a close-up when useful.
- Separate **visible observation**, **inference**, **source-backed fact** and **unknown**.
- Express uncertainty in plain language. Do not claim exact make/model from an ambiguous image.
- Request another angle or label image only when it materially improves the answer.
- Link every analysis result to the exact media item and model/provider version used.

## 5. Video understanding

Video is a first-class conversation attachment, not merely a file that can be stored.

### Input and preprocessing

- Support common browser-decodable formats first; publish the exact supported formats and limits in the UI.
- Detect unsupported codecs before or during upload and explain the available conversion alternative. Do not promise universal HEVC/H.265 support.
- Enforce configurable limits for file size, duration, resolution, frame rate and number of videos per message.
- Extract a bounded set of representative frames (scene changes and/or interval sampling) rather than sending every frame to a vision model.
- Preserve timestamps for every extracted frame so the answer can refer to the relevant moment.
- Extract audio only when present and only through a configured, privacy-reviewed pipeline.
- If audio transcription is unavailable, continue with visual-only analysis and state that spoken sound was not analysed.
- If video is too long or large, offer trimming or a clear limit; do not silently sample away a critical event.

### Analysis result

A video analysis should distinguish:
- What is visibly happening and at which timestamps.
- What movement, sequence or change is observed.
- What can be heard, only if audio analysis actually ran.
- Possible explanations, clearly marked as hypotheses.
- Missing views or information needed to confirm an explanation.
- Safety concerns and the safest next step.

Do not diagnose a mechanical fault from sound or motion alone when evidence is insufficient. Do not infer safe operating conditions from a video. High-risk electrical, gas, pressure, structural, machinery and other hazardous situations remain subject to the existing restrictive safety policy.

### Processing and cost controls

Video analysis can be substantially more expensive than text or still images. Before enabling it:
- Benchmark representative clips across trades, lighting, camera movement, background noise and device-generated codecs.
- Measure upload, frame extraction, audio transcription and model inference separately.
- Set per-worker quotas, maximum duration, maximum frames, retry limits and clear cost ceilings.
- Use asynchronous processing for longer clips and expose queued/processing/ready/failed states.
- Avoid repeated inference for an unchanged media item; cache only within the same privacy and retention boundary.
- Keep provider selection behind adapters and keep video/vision flags disabled until a provider, pricing, retention and safety review are approved.

## 6. Analysis orchestration and trust

All modalities feed one conversation context, but media analysis does not bypass the existing KIVORA evidence and safety gates.

- Treat worker captions as worker-provided context, not verified facts.
- Treat visual/audio observations as observations with source media and timestamps.
- Treat model interpretations as hypotheses until corroborated.
- Manufacturer documentation and other approved sources remain separate from model-generated descriptions.
- Validate source IDs and provenance before presenting a statement as sourced.
- Similar-looking components or similar model numbers are leads, not proof of compatibility.
- The most restrictive applicable trade/safety policy wins.
- The model may tighten a safety decision but must never loosen a deterministic gate.
- If a media-processing provider is unavailable, preserve the user's question and attachment state and offer retry; do not fabricate a result.

## 7. Accessibility and resilience

- Every attachment action has a visible text label and accessible name.
- Provide text alternatives for media status and analysis; do not rely on icons or colour alone.
- Video analysis output includes timestamps and a text summary. Captions/transcripts are shown when generated.
- Keyboard users can open the file picker, remove attachments, send, cancel and retry.
- Respect reduced-motion settings and avoid autoplaying video or audio.
- Do not autoplay uploaded video with sound.
- Keep a text-only path available at all times.
- Handle denied camera/microphone permission, offline state, interrupted uploads, expired sessions, storage errors and unsupported codecs with actionable messages.
- Avoid exposing sensitive filenames or media metadata in public logs or analytics.

## 8. Test matrix and release gates

Test actual supported browser/device combinations, not only responsive emulation.

| Platform | Browser coverage | Required checks |
|---|---|---|
| Android phone | Chrome; Samsung Internet where in scope | Camera capture, gallery/file picker, video capture/upload, keyboard, rotation, upload interruption |
| iPhone | Safari; Chrome on iOS | Camera/library selection, video selection, permissions, HEIC/HEVC handling, safe areas, keyboard |
| Android tablet | Chrome | Portrait/landscape layouts, touch, file selection, multi-column transitions |
| iPad | Safari | Portrait/landscape, photo/video library, file picker, split-view/narrow widths |
| Windows desktop/laptop | Chrome, Edge, Firefox | Keyboard, drag/drop if supported, file picker, webcam permission if implemented, large/small windows |
| macOS desktop/laptop | Safari, Chrome, Firefox | File picker, media codec handling, keyboard, zoom and responsive layout |
| Assistive technology | Platform screen readers and keyboard-only | Labels, focus order, status announcements, zoom/reflow, captions/transcripts |

Release gates:
- No blocking horizontal overflow at 320 CSS px or at supported tablet/desktop widths.
- No critical workflow that requires hover or a specific device.
- Upload ownership, MIME/signature validation, size/duration limits and deletion tests pass.
- Cross-account and cross-conversation media access attempts are denied.
- Expired/failed upload intents cannot be finalized or read.
- Conversation and account deletion cover original and derived media.
- Video timestamps map to the correct extracted frames.
- UI never claims a media item was analysed unless a successful analysis record exists.
- AI/vision/video providers remain disabled until separately approved and budgeted.
- Manual smoke tests on representative physical iPhone, Android, tablet and desktop browsers are recorded before public release.

## 9. Implementation sequence

1. Correct the responsive product contract and audit existing layouts at mobile, tablet and desktop widths.
2. Add media data contracts and D1 metadata migration, with ownership/deletion tests.
3. Provision private object storage only after the account-level storage/cost/retention decision is approved.
4. Implement authenticated image upload and private retrieval; keep UI gated until end-to-end tests pass.
5. Add image analysis behind a provider adapter and disabled feature flag.
6. Add video upload, bounded frame extraction, timestamped analysis and optional audio transcription.
7. Add real-device/browser QA, abuse limits, cost monitoring and deletion verification.
8. Enable each modality independently only after its release gates pass.

## 10. Current implementation status

At the time this document was written, the app has text consultation and browser-native speech playback. The repository does not yet contain a private media upload pipeline, media metadata schema, image analysis, video upload, video frame extraction, audio transcription or multimodal inference. AI inference remains disabled. This architecture is a build plan, not a claim that those capabilities are live.
