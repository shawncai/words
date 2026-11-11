import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { play } from "../lib/audio";
import { toast } from "./Toast";

export function Speak({
  url,
  text,
  accent = "uk",
  label,
  size = "md",
  rate = 1,
  className = "",
  kbd,
}: {
  url: string | null;
  text: string;
  accent?: "uk" | "us";
  label?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  rate?: number;
  className?: string;
  kbd?: string;
}) {
  const [on, setOn] = useState(false);
  const request = useRef(0);
  const run = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOn(true);
    const mine = ++request.current;
    try {
      const result = await play(url, text, accent, rate);
      if (result === "unsupported") toast("暂无可用录音，设备也没有可用的离线语音。", "warn");
    } catch {
      toast("播放失败，请重试。", "warn");
    } finally {
      if (mine === request.current) setOn(false);
    }
  };
  return (
    <button
      type="button"
      className={`speak speak-${size} ${on ? "is-on" : ""} ${label ? "has-label" : ""} ${className}`}
      onClick={run}
      aria-label={typeof label === "string" ? `朗读 ${label}` : `朗读 ${text}`}
      title={kbd ? `朗读（${kbd}）` : "朗读"}
    >
      <span className="speak-icon">
        <Volume2 size={size === "lg" ? 22 : size === "sm" ? 15 : 18} strokeWidth={1.8} />
        <span className="speak-waves" />
      </span>
      {label && <span className="speak-label">{label}</span>}
    </button>
  );
}
