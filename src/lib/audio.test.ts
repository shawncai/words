import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { play, setAudioActive, stopAudio } from "./audio";

class Clip {
  static clips: Clip[] = [];
  onended: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playbackRate = 1;
  paused = false;
  constructor(public url: string) { Clip.clips.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; this.onpause?.(); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { setTimeout, clearTimeout } });
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: Clip });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { visibilityState: "visible" } });
  setAudioActive(true);
  Clip.clips = [];
});
afterEach(() => stopAudio());

test("a cached clip can finish immediately without hanging playback", async () => {
  const result = play("/atlas/audio/uk/thursday.mp3", "Thursday");
  Clip.clips[0].onended?.();
  assert.equal(await result, "recorded");
});

test("background cancellation settles playback even before play has resolved", async () => {
  const result = play("/atlas/audio/uk/thursday.mp3", "Thursday");
  stopAudio();
  assert.equal(await result, "stopped");
  assert.equal(Clip.clips[0].paused, true);
});

test("a decoding error after playback starts returns unavailable instead of hanging", async () => {
  const result = play("/broken.mp3", "Thursday");
  await Promise.resolve();
  Clip.clips[0].onerror?.();
  assert.equal(await result, "unsupported");
});

test("rapidly switching pronunciation cancels only the previous recording", async () => {
  const uk = play("/uk.mp3", "Thursday", "uk");
  const us = play("/us.mp3", "Thursday", "us");
  assert.equal(await uk, "stopped");
  Clip.clips[1].onended?.();
  assert.equal(await us, "recorded");
});

test("a missing recording without a device voice is explicitly unavailable", async () => {
  assert.equal(await play(null, "Thursday"), "unsupported");
});

test("entry autoplay arriving after native backgrounding never creates audio", async () => {
  const current = play("/current.mp3", "Thursday");
  setAudioActive(false);
  assert.equal(await current, "stopped");
  assert.equal(await play("/late-entry.mp3", "Friday"), "stopped");
  assert.equal(Clip.clips.length, 1);
  assert.equal(Clip.clips[0].paused, true);
  setAudioActive(true);
  assert.equal(Clip.clips.length, 1, "foregrounding must not replay queued autoplay");
});

test("hidden document blocks autoplay even before native lifecycle listeners run", async () => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: { visibilityState: "hidden" } });
  assert.equal(await play("/late-entry.mp3", "Friday"), "stopped");
  assert.equal(await play(null, "Friday"), "stopped");
  assert.equal(Clip.clips.length, 0);
});
