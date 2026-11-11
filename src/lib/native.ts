import { App as NativeApp } from "@capacitor/app";
import { Capacitor, SystemBars, SystemBarsStyle, type PluginListenerHandle } from "@capacitor/core";
import { useEffect } from "react";
import { flush } from "../store/store";
import { setAudioActive, stopAudio } from "./audio";
import { currentLocation, go } from "./router";
import { setSoundActive } from "./sound";

const backHandlers = new Set<() => void>();

/** Dialogs register only while visible, so Back closes the most recent surface. */
export function registerBackHandler(close: () => void) {
  backHandlers.add(close);
  return () => { backHandlers.delete(close); };
}

export function syncSystemBars(dark: boolean) {
  if (Capacitor.isNativePlatform()) {
    void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => undefined);
  }
}

export function useNativeRuntime() {
  useEffect(() => {
    let nativeActive = true;
    let active = true;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const updateActive = () => {
      const next = nativeActive && document.visibilityState !== "hidden";
      setAudioActive(next);
      if (next === active) return;
      active = next;
      if (!active) {
        flush();
        window.dispatchEvent(new Event("word-atlas:audio-suspend"));
      }
      setSoundActive(active);
    };
    document.addEventListener("visibilitychange", updateActive);
    updateActive();

    const keep = async (handle: Promise<PluginListenerHandle>) => {
      const listener = await handle;
      if (disposed) await listener.remove();
      else handles.push(listener);
    };
    if (Capacitor.isNativePlatform()) {
      void keep(NativeApp.addListener("appStateChange", ({ isActive }) => {
        nativeActive = isActive;
        updateActive();
      }));
      void keep(NativeApp.addListener("backButton", () => {
        // Android normally consumes Back for the IME. Keep this fallback for
        // WebViews which deliver it before visualViewport has resized.
        if (document.documentElement.dataset.keyboardOpen === "true") {
          (document.activeElement as HTMLElement | null)?.blur();
          return;
        }
        const close = [...backHandlers].at(-1);
        if (close) {
          close();
          return;
        }
        flush();
        stopAudio();
        if (currentLocation().route.page !== "today") go({ page: "today" }, null, true);
        else void NativeApp.minimizeApp();
      }));
    }
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", updateActive);
      handles.forEach((handle) => { void handle.remove(); });
    };
  }, []);
}
