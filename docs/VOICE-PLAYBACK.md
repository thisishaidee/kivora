# KIVORA Voice Playback

**Status:** Initial on-device text-to-speech controls implemented for the current assessment and response cards. Speech-to-text and live AI inference are not implemented.

## Current behaviour

- A worker can choose Listen on a displayed assessment or KIVORA response.
- Playback is started only by an explicit tap; there is no autoplay.
- Pause, resume and stop controls are available while speaking.
- When playback finishes, Listen becomes available again so the worker can replay.
- Long responses are split into shorter speech chunks to avoid browser utterance-size limits.
- The browser's installed speech voice is selected when a matching language voice is available; otherwise the device default is used.
- Playback is performed locally through the browser Speech Synthesis API. No audio recording is uploaded and no external TTS provider is called.

## Current limitations

- Playback depends on browser/device support and installed voices.
- English is currently mapped to an en-NG voice preference, with browser fallback; Pidgin does not yet have a dedicated validated voice.
- French requests prefer fr-FR, with browser fallback.
- The interface speaks the deterministic preview assessment and response text that currently exists. AI inference remains disabled, so this is not a live AI voice assistant.
- Voice input, editable speech transcripts, workshop-noise handling and speech-provider benchmarking remain future work.

## Safety and accessibility

Speech playback does not change or bypass evidence checks, compatibility rules or safety gates. The visible text remains the source of truth. Workers can stop playback immediately and continue using the interface without audio. Do not auto-play safety-critical instructions.

## Next validation

Test on Android Chrome with Nigerian English technical phrases, measurements, manufacturer/model numbers, long responses, pause/resume, replay, interruption by a second response and unsupported-browser fallback. Compare installed voices before selecting a remote TTS provider. A paid speech API must not be activated without a cost and privacy review.
