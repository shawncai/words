import { Capacitor } from "@capacitor/core";
import { duck } from "./sound";

export type PlaybackResult = "recorded" | "device" | "stopped" | "unsupported";
let current: HTMLAudioElement | null = null;
let cancelCurrent: (() => void) | null = null;
let token = 0;
let active = true;

const playbackAllowed = () => active && (typeof document === "undefined" || document.visibilityState !== "hidden");

/** Also gate future autoplay calls from entry loads that finish in the background. */
export function setAudioActive(next: boolean) {
  active = next;
  if (!next) stopAudio();
}

export function stopAudio() {
  token++;
  cancelCurrent?.();
  cancelCurrent = null;
  current?.pause();
  current = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  duck(false);
}

/** Every playback settles on completion, cancellation, load failure or timeout. */
export async function play(url: string | null | undefined, text: string, accent: "uk" | "us" = "uk", rate = 1): Promise<PlaybackResult> {
  if (!playbackAllowed()) return "stopped";
  stopAudio();
  const mine = ++token;
  duck(true);
  try {
    if (url) {
      const result = await recording(url, rate);
      if (!playbackAllowed() || mine !== token || result === "stopped") return "stopped";
      if (result === "recorded") return result;
    }
    if (!playbackAllowed() || mine !== token) return "stopped";
    return await deviceVoice(text, accent, rate, mine);
  } finally {
    // A superseded pronunciation must not restore ambience over its successor.
    if (mine === token) duck(false);
  }
}

function recording(url: string, rate: number): Promise<"recorded" | "stopped" | "failed"> {
  return new Promise((resolve) => {
    const a = new Audio(url);
    current = a;
    a.playbackRate = rate;
    let settled = false;
    const finish = (result: "recorded" | "stopped" | "failed") => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      a.onended = a.onpause = a.onerror = null;
      a.pause();
      if (current === a) {
        current = null;
        cancelCurrent = null;
      }
      resolve(result);
    };
    // A damaged local file must not leave the button spinning indefinitely.
    const timer = window.setTimeout(() => finish("failed"), 120_000);
    cancelCurrent = () => finish("stopped");
    a.onended = () => finish("recorded");
    a.onpause = () => finish("stopped");
    a.onerror = () => finish("failed");
    // Bind handlers before play(), including for cached clips and fast errors.
    void a.play().catch(() => finish("failed"));
  });
}

async function deviceVoice(text: string, accent: "uk" | "us", rate: number, mine: number): Promise<PlaybackResult> {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return "unsupported";
  const speech = window.speechSynthesis;
  const lang = accent === "uk" ? "en-GB" : "en-US";
  const voices = () => speech.getVoices().filter((voice) =>
    voice.lang.replace("_", "-") === lang && (!Capacitor.isNativePlatform() || voice.localService),
  );
  let available = voices();
  if (!available.length) {
    await new Promise<void>((resolve) => {
      const done = () => {
        window.clearTimeout(timer);
        speech.removeEventListener("voiceschanged", done);
        if (cancelCurrent === done) cancelCurrent = null;
        resolve();
      };
      const timer = window.setTimeout(done, 800);
      cancelCurrent = done;
      speech.addEventListener("voiceschanged", done, { once: true });
    });
    available = voices();
  }
  if (!playbackAllowed() || mine !== token) return "stopped";
  if (!available.length) return "unsupported";
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate * 0.95;
    utterance.voice = available.find((voice) => /premium|enhanced|natural|google/i.test(voice.name)) || available[0];
    let settled = false;
    const finish = (result: PlaybackResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      utterance.onend = utterance.onerror = null;
      if (cancelCurrent === cancel) cancelCurrent = null;
      resolve(result);
    };
    const cancel = () => finish("stopped");
    const timer = window.setTimeout(() => {
      finish("unsupported");
      speech.cancel();
    }, 120_000);
    cancelCurrent = cancel;
    utterance.onend = () => finish("device");
    utterance.onerror = () => finish("unsupported");
    speech.speak(utterance);
  });
}
