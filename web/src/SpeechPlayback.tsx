import { useEffect, useRef, useState } from "react";

type SpeechPlaybackProps = {
  text: string;
  language?: "en" | "en-ng" | "pcm-ng" | "fr" | string;
};

type PlaybackState = "idle" | "speaking" | "paused";

const MAX_CHUNK_LENGTH = 1_600;

export function splitForSpeech(value: string): string[] {
  const remaining = value.replace(/\s+/g, " ").trim();
  if (!remaining) return [];

  const chunks: string[] = [];
  let rest = remaining;

  while (rest.length > MAX_CHUNK_LENGTH) {
    let splitAt = Math.max(
      rest.lastIndexOf(". ", MAX_CHUNK_LENGTH),
      rest.lastIndexOf("? ", MAX_CHUNK_LENGTH),
      rest.lastIndexOf("! ", MAX_CHUNK_LENGTH),
    );

    if (splitAt < 700) splitAt = rest.lastIndexOf(" ", MAX_CHUNK_LENGTH);
    if (splitAt < 1) {
      chunks.push(rest.slice(0, MAX_CHUNK_LENGTH));
      rest = rest.slice(MAX_CHUNK_LENGTH).trim();
    } else {
      chunks.push(rest.slice(0, splitAt + 1).trim());
      rest = rest.slice(splitAt + 1).trim();
    }
  }

  if (rest) chunks.push(rest);
  return chunks;
}

function speechLanguage(language: string): string {
  if (language === "fr") return "fr-FR";
  return "en-NG";
}

export default function SpeechPlayback({ text, language = "en" }: SpeechPlaybackProps) {
  const [state, setState] = useState<PlaybackState>("idle");
  const [supported, setSupported] = useState(false);
  const chunksRef = useRef<string[]>([]);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setSupported(
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined",
    );

    return () => {
      mountedRef.current = false;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    chunksRef.current = [];
    setState("idle");
  }, [text]);

  const speakChunk = (index: number) => {
    const chunks = chunksRef.current;
    if (!supported || index >= chunks.length) {
      if (mountedRef.current) setState("idle");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = speechLanguage(language);
    utterance.rate = 0.96;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => voice.lang.toLowerCase() === utterance.lang.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      if (!mountedRef.current) return;
      if (index + 1 < chunks.length) speakChunk(index + 1);
      else setState("idle");
    };
    utterance.onerror = () => {
      if (mountedRef.current) setState("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  const start = () => {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    chunksRef.current = splitForSpeech(text);
    if (chunksRef.current.length === 0) return;
    setState("speaking");
    speakChunk(0);
  };

  const pause = () => {
    if (state !== "speaking") return;
    window.speechSynthesis.pause();
    setState("paused");
  };

  const resume = () => {
    if (state !== "paused") return;
    window.speechSynthesis.resume();
    setState("speaking");
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    chunksRef.current = [];
    setState("idle");
  };

  if (!supported) {
    return <p className="speech-unavailable">Audio playback is not supported in this browser.</p>;
  }

  return (
    <div className="speech-controls" aria-label="Listen to KIVORA's response">
      {state === "idle" && (
        <button type="button" className="speech-button" onClick={start} disabled={!text.trim()}>
          <span aria-hidden="true">▶</span> Listen
        </button>
      )}
      {state === "speaking" && (
        <>
          <button type="button" className="speech-button" onClick={pause}>Pause</button>
          <button type="button" className="speech-button speech-button-muted" onClick={stop}>Stop</button>
        </>
      )}
      {state === "paused" && (
        <>
          <button type="button" className="speech-button" onClick={resume}>Resume</button>
          <button type="button" className="speech-button speech-button-muted" onClick={stop}>Stop</button>
        </>
      )}
    </div>
  );
}
