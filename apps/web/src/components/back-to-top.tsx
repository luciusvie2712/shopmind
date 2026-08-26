"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const VISIBILITY_THRESHOLD = 480;

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    function updateVisibility(): void {
      animationFrame.current = null;
      setVisible(window.scrollY > VISIBILITY_THRESHOLD);
    }

    function scheduleVisibilityUpdate(): void {
      if (animationFrame.current !== null) return;
      animationFrame.current = window.requestAnimationFrame(updateVisibility);
    }

    scheduleVisibilityUpdate();
    window.addEventListener("scroll", scheduleVisibilityUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleVisibilityUpdate);
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, []);

  function scrollToTop(): void {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      aria-hidden={!visible}
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
      className={`fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full border border-white/80 bg-slate-950 text-white shadow-[0_12px_32px_rgba(15,23,42,0.28)] transition duration-200 hover:-translate-y-1 hover:bg-teal-600 hover:shadow-[0_16px_36px_rgba(13,148,136,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none sm:bottom-6 sm:right-6 ${
        visible
          ? "visible translate-y-0 opacity-100"
          : "invisible translate-y-3 pointer-events-none opacity-0"
      }`}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
