"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/api/schemas";

/**
 * The page's one dealt moment (tasteskill, word-highlight): the loop
 * statement lights word by word as its section crosses the middle of
 * the screen, scrubbed to the scrollbar in both directions. The
 * server renders every word lit, so the statement reads whole
 * without script; under reduced motion it stays lit. Unlit words use
 * ink-muted, which keeps 4.5:1 or better at every step.
 */
export function WordHighlight({ text, locale }: { text: string; locale: Locale }) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = locale === "zh-CN" ? Array.from(text) : text.split(" ");
  const [lit, setLit] = useState(words.length);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Progress runs while the statement travels from 85% down the
      // viewport to 35%: before that nothing is lit, after it all is.
      const p = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (vh * 0.5)));
      setLit(Math.round(p * words.length));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [words.length]);

  return (
    <span ref={ref}>
      {words.map((word, i) => (
        <span key={i} className="wh-word" style={{ color: i < lit ? "var(--ink)" : "var(--ink-muted)" }}>
          {word}
          {locale === "zh-CN" ? "" : i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
