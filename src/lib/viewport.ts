import { useEffect } from "react";

export const prefersTouchInput = () =>
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

function editable(
  element: Element | null,
): element is HTMLInputElement | HTMLTextAreaElement {
  return (
    (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement) &&
    !element.readOnly &&
    !element.disabled
  );
}

/** Keep fixed surfaces inside the visible viewport when Android opens its keyboard. */
export function useMobileViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let fullHeight = Math.max(window.innerHeight, viewport?.height ?? 0);
    let layoutWidth = window.innerWidth;
    let frame = 0;
    let settle = 0;

    const revealInput = () => {
      const active = document.activeElement;
      if (!editable(active)) return;
      const target =
        active.closest<HTMLElement>(".spell, .typing-answer, .palette-input") ??
        active;
      const rect = target.getBoundingClientRect();
      const top = (viewport?.offsetTop ?? 0) + 12;
      const bottom = top + (viewport?.height ?? window.innerHeight) - 24;
      if (rect.top < top || rect.bottom > bottom)
        target.scrollIntoView({ block: "nearest", behavior: "instant" });
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = viewport?.height ?? window.innerHeight;
        const typing = editable(document.activeElement);
        // Pinch zoom also shrinks visualViewport, but must not be treated as a keyboard.
        const unzoomed = !viewport || Math.abs(viewport.scale - 1) < 0.05;
        // Folding changes the window's width and height together. The outer
        // display's height is not a keyboard baseline for the inner display.
        const widthChanged = Math.abs(window.innerWidth - layoutWidth) > 1;
        layoutWidth = window.innerWidth;
        if (widthChanged || (!typing && unzoomed))
          fullHeight = Math.max(window.innerHeight, height);
        else fullHeight = Math.max(fullHeight, window.innerHeight, height);
        const keyboard = unzoomed && typing && fullHeight - height > 120;
        root.style.setProperty("--viewport-height", `${height}px`);
        root.style.setProperty(
          "--viewport-top",
          `${viewport?.offsetTop ?? 0}px`,
        );
        root.dataset.keyboardOpen = String(keyboard);
        if (typing && unzoomed) {
          clearTimeout(settle);
          settle = window.setTimeout(revealInput, 120);
        }
      });
    };

    const rotate = () => {
      fullHeight = 0;
      update();
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", rotate);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", rotate);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      root.style.removeProperty("--viewport-height");
      root.style.removeProperty("--viewport-top");
      delete root.dataset.keyboardOpen;
    };
  }, []);
}
