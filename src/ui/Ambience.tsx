import { AudioLines, Check, CloudRain, Coffee, Flame, Sailboat, Sparkles, Trees, VolumeX, Waves } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AMBIENCE, primeCues, setAmbience, type AmbienceId } from "../lib/sound";
import { store, useStore } from "../store/store";
import { registerBackHandler } from "../lib/native";

const ICONS: Record<AmbienceId, typeof CloudRain> = { stars: Sparkles, rain: CloudRain, sea: Waves, forest: Trees, fire: Flame, voyage: Sailboat, cafe: Coffee };

/** Keeps the ambience in sync with settings; browsers only allow audio after a user gesture. */
export function AmbienceController() {
  const ambience = useStore((s) => s.settings.ambience);
  const volume = useStore((s) => s.settings.ambienceVolume);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const suspend = () => setArmed(false);
    window.addEventListener("word-atlas:audio-suspend", suspend);
    return () => window.removeEventListener("word-atlas:audio-suspend", suspend);
  }, []);
  useEffect(() => {
    if (armed) return;
    const arm = () => {
      primeCues();
      setArmed(true);
    };
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [armed]);
  useEffect(() => {
    if (armed) void setAmbience(ambience === "off" ? null : ambience, volume);
  }, [armed, ambience, volume]);
  return null;
}

export function AmbiencePicker() {
  const [open, setOpen] = useState(false);
  const ambience = useStore((s) => s.settings.ambience);
  const volume = useStore((s) => s.settings.ambienceVolume);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const unregisterBack = registerBackHandler(() => setOpen(false));
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      unregisterBack();
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const on = ambience !== "off";
  return (
    <div className="amb" ref={box}>
      <button className={`icon-btn amb-btn ${on ? "is-on" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="环境声" title="环境声">
        <AudioLines size={19} />
        {on && <span className="amb-bars" aria-hidden="true"><i /><i /><i /></span>}
      </button>
      {open && (
        <div className="amb-pop" role="dialog" aria-label="环境声">
          <p className="eyebrow">环境声</p>
          <ul>
            {AMBIENCE.map(({ id, label }) => {
              const Icon = ICONS[id];
              const sel = ambience === id;
              return (
                <li key={id}>
                  <button className={sel ? "is-on" : ""} onClick={() => store.settings({ ambience: sel ? "off" : id })} aria-pressed={sel}>
                    <Icon size={18} strokeWidth={1.7} />
                    <span>{label}</span>
                    {sel && <Check size={16} />}
                  </button>
                </li>
              );
            })}
            <li>
              <button className={!on ? "is-on" : ""} onClick={() => store.settings({ ambience: "off" })} aria-pressed={!on}>
                <VolumeX size={18} strokeWidth={1.7} />
                <span>安静</span>
                {!on && <Check size={16} />}
              </button>
            </li>
          </ul>
          <label className="amb-vol">
            <span>音量</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => store.settings({ ambienceVolume: Number(e.target.value) })} disabled={!on} />
          </label>
        </div>
      )}
    </div>
  );
}
