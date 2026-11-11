/**
 * Sound design: short UI cues and looping ambience, played through Web Audio so
 * loops are gapless and the ambience can duck under pronunciations.
 */
const BASE = `${import.meta.env?.BASE_URL ?? "/"}sfx/`;

export type Cue = "correct" | "wrong" | "flip" | "page" | "complete" | "streak" | "start" | "tap" | "key" | "twinkle" | "fly" | "ignite";
export const AMBIENCE = [
  { id: "stars", label: "星空音乐" },
  { id: "rain", label: "雨天图书馆" },
  { id: "sea", label: "清晨海岸" },
  { id: "forest", label: "林间早晨" },
  { id: "fire", label: "夜晚壁炉" },
  { id: "voyage", label: "远航船舱" },
  { id: "cafe", label: "安静咖啡馆" },
] as const;
export type AmbienceId = (typeof AMBIENCE)[number]["id"];

const CUE_GAIN: Record<Cue, number> = {
  correct: 0.55,
  wrong: 0.5,
  flip: 0.45,
  page: 0.4,
  complete: 0.6,
  streak: 0.5,
  start: 0.5,
  tap: 0.3,
  key: 0.18,
  twinkle: 0.22,
  fly: 0.4,
  ignite: 0.45,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const sources = new Set<AudioBufferSourceNode>();
let active = true;
let audioEpoch = 0;

/** Stop sources so a foreground resume cannot replay old cues or voiceovers. */
export function setSoundActive(next: boolean) {
  active = next;
  if (next) return;
  audioEpoch++;
  ambRequest++;
  for (const source of sources) {
    try { source.stop(); } catch { /* already finished */ }
    source.disconnect();
  }
  sources.clear();
  amb = null;
  ducked = false;
  if (ctx?.state === "running") void ctx.suspend().catch(() => undefined);
}

function track(source: AudioBufferSourceNode) {
  sources.add(source);
  source.onended = () => {
    sources.delete(source);
    source.disconnect();
  };
}

function audio() {
  if (!active) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

function load(file: string) {
  let p = buffers.get(file);
  if (!p) {
    const c = audio();
    if (!c) return Promise.resolve(null);
    p = fetch(BASE + file)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => c.decodeAudioData(b))
      .catch(() => null);
    buffers.set(file, p);
  }
  return p;
}

/** Warm the cue buffers after the first user gesture so the first answer isn't silent. */
export function primeCues() {
  (Object.keys(CUE_GAIN) as Cue[]).forEach((c) => void load(`${c}.mp3`));
}

/** Fetch and decode files ahead of time (decoding works before the first user gesture). */
export function preloadFiles(files: string[]) {
  files.forEach((f) => void load(f));
}

/** Play any file from the sound folder; call from a user gesture so audio is allowed. */
export async function playFile(file: string, gain = 0.6, delay = 0) {
  const epoch = audioEpoch;
  const c = audio();
  if (!c || !master) return;
  const buf = await load(file);
  if (!buf || !active || epoch !== audioEpoch) return;
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(master);
  track(src);
  src.start(c.currentTime + delay);
}

export async function cue(name: Cue) {
  const epoch = audioEpoch;
  const c = audio();
  if (!c || !master) return;
  const buf = await load(`${name}.mp3`);
  if (!buf || !active || epoch !== audioEpoch) return;
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = CUE_GAIN[name];
  src.buffer = buf;
  src.connect(g).connect(master);
  track(src);
  src.start();
}

/* ---------- ambience ---------- */

let amb: { id: AmbienceId; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let ambVolume = 0.5;
let ducked = false;
let ambRequest = 0;
const level = () => ambVolume * (ducked ? 0.35 : 1) * 0.9;

function fadeTo(g: GainNode, v: number, seconds: number) {
  const c = ctx!;
  g.gain.cancelScheduledValues(c.currentTime);
  g.gain.setValueAtTime(g.gain.value, c.currentTime);
  g.gain.linearRampToValueAtTime(v, c.currentTime + seconds);
}

export async function setAmbience(id: AmbienceId | null, volume = ambVolume) {
  const request = ++ambRequest;
  ambVolume = volume;
  if (amb && amb.id === id) {
    fadeTo(amb.gain, level(), 0.4);
    return;
  }
  const old = amb;
  amb = null;
  if (old) {
    fadeTo(old.gain, 0, 1.2);
    old.src.stop(ctx!.currentTime + 1.3);
  }
  if (!id) return;
  const c = audio();
  if (!c || !master) return;
  const buf = await load(`amb-${id}.mp3`);
  if (!buf || amb || !active || request !== ambRequest) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  // Skip the decoder's padding at both ends so the loop is seamless.
  src.loopStart = 0.06;
  src.loopEnd = buf.duration - 0.06;
  const gain = c.createGain();
  gain.gain.value = 0;
  src.connect(gain).connect(master);
  track(src);
  src.start(0, 0.06);
  amb = { id, src, gain };
  fadeTo(gain, level(), 2);
}

/** Lower the ambience while a word or sentence is being spoken. */
export function duck(on: boolean) {
  ducked = on;
  if (amb) fadeTo(amb.gain, level(), on ? 0.15 : 0.6);
}

export const ambienceId = () => amb?.id ?? null;
