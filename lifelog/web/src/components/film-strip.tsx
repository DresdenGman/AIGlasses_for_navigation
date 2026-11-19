"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FrameDetail, Locale } from "@/lib/api/schemas";
import { FramePlate } from "@/components/media";
import { t } from "@/lib/i18n";
import { formatClock } from "@/lib/time";
import { noDescription } from "@/lib/text";

type StripItem =
  | { kind: "frame"; frame: FrameDetail; key: string }
  | { kind: "pause"; start: number; end: number; key: string };

export function FilmStrip({
  frames,
  pauses,
  locale,
  activeMs,
  onSeek,
}: {
  frames: FrameDetail[];
  pauses: { start_ms: number; end_ms: number | null }[];
  locale: Locale;
  activeMs?: number;
  onSeek: (ms: number) => void;
}) {
  const copy = t(locale);
  const parentRef = useRef<HTMLDivElement>(null);
  const items: StripItem[] = [];
  const ordered = [...frames].filter((frame) => frame.quality === "ok").sort((a, b) => a.ts_ms - b.ts_ms);
  for (const pause of pauses) {
    if (pause.end_ms === null) continue;
    items.push({ kind: "pause", start: pause.start_ms, end: pause.end_ms, key: `p-${pause.start_ms}` });
  }
  for (const frame of ordered) items.push({ kind: "frame", frame, key: frame.id });
  items.sort((a, b) => (a.kind === "pause" ? a.start : a.frame.ts_ms) - (b.kind === "pause" ? b.start : b.frame.ts_ms));

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      if (!item || item.kind === "frame") return 112;
      return Math.max(120, ((item.end - item.start) / 60_000) * 4);
    },
    overscan: 8,
  });

  return (
    <div>
      <div className="sprocket" aria-hidden="true" />
      <div ref={parentRef} className="film-scroll" tabIndex={0} role="region" aria-label={copy.filmstrip}>
        <div className="relative h-[92px]" style={{ width: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtual) => {
            const item = items[virtual.index];
            if (!item) return null;
            if (item.kind === "pause") {
              return (
                <div key={item.key} className="film-gap hatch" style={{ transform: `translateX(${virtual.start}px)`, width: virtual.size }}>
                  <span className="eyebrow">
                    {copy.paused} {formatClock(item.start, locale)}–{formatClock(item.end, locale)}
                  </span>
                </div>
              );
            }
            const current = activeMs !== undefined && Math.abs(item.frame.ts_ms - activeMs) < 60_000;
            return (
              <button
                key={item.key}
                type="button"
                className={`film-frame ${current ? "film-frame-current" : ""}`}
                style={{ transform: `translateX(${virtual.start}px)`, width: virtual.size - 8 }}
                onClick={() => onSeek(item.frame.ts_ms)}
              >
                <FramePlate frameId={item.frame.id} alt={item.frame.caption ?? noDescription(locale)} className="h-[72px] w-[96px]" />
                <span className="eyebrow mt-1 block">{formatClock(item.frame.ts_ms, locale)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="sprocket" aria-hidden="true" />
      <ol className="sr-only">
        {ordered.map((frame) => (
          <li key={frame.id}>
            <a href={`#frame-${frame.id}`} onClick={(event) => { event.preventDefault(); onSeek(frame.ts_ms); }}>
              {formatClock(frame.ts_ms, locale)} {frame.caption ?? noDescription(locale)}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
