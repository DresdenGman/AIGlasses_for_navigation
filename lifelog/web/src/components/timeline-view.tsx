"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FrameDetail, Locale, Segment, Timeline, Utterance } from "@/lib/api/schemas";
import { DayNav } from "@/components/day-nav";
import { FramePlate, UncertainBadge } from "@/components/media";
import { frameAsset } from "@/lib/images";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { formatClock, formatDate, isInsidePause, midnightMs } from "@/lib/time";
import { noDescription, speakerName } from "@/lib/text";

function nearestFrame(frames: FrameDetail[], time: number): FrameDetail | null {
  let best: FrameDetail | null = null;
  let dist = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    const gap = Math.abs(frame.ts_ms - time);
    if (gap < dist) {
      dist = gap;
      best = frame;
    }
  }
  return best;
}

export function TimelineView({
  timeline,
  frames,
  utterances,
  segments,
  locale,
  initialT,
  focusId,
}: {
  timeline: Timeline;
  frames: FrameDetail[];
  utterances: Utterance[];
  segments: Segment[];
  locale: Locale;
  initialT?: number;
  focusId?: string;
}) {
  const copy = t(locale);
  const prefs = usePrefs();
  const router = useRouter();
  const midnight = midnightMs(timeline.day);
  const ordered = useMemo(() => [...frames].sort((a, b) => a.ts_ms - b.ts_ms), [frames]);
  const [time, setTime] = useState(initialT ?? ordered[0]?.ts_ms ?? midnight);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const frame = nearestFrame(ordered, time);
  const paused = isInsidePause(time, timeline.pauses);
  const segment = segments.find((item) => time >= item.start_ms && time < item.end_ms) ?? null;
  const activeUtterance = utterances.find((item) => time >= item.start_ms && time <= item.end_ms) ?? null;

  useEffect(() => {
    const node = transcriptRef.current?.querySelector<HTMLElement>("[data-current='true']");
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [activeUtterance?.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.getAttribute("role") === "slider")) return;
      const index = frame ? ordered.findIndex((item) => item.id === frame.id) : 0;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        if (event.shiftKey) {
          setTime((current) => Math.min(midnight + 86_400_000, Math.max(midnight, current + (event.key === "ArrowRight" ? 300_000 : -300_000))));
          return;
        }
        const next = ordered[index + (event.key === "ArrowRight" ? 1 : -1)];
        if (next) setTime(next.ts_ms);
      } else if (event.key === "Home") {
        event.preventDefault();
        setTime(ordered[0]?.ts_ms ?? midnight);
      } else if (event.key === "End") {
        event.preventDefault();
        setTime(ordered[ordered.length - 1]?.ts_ms ?? midnight + 86_400_000 - 1);
      } else if (event.key === "j" || event.key === "J" || event.key === "k" || event.key === "K") {
        event.preventDefault();
        const at = segments.findIndex((item) => time >= item.start_ms && time < item.end_ms);
        const next = segments[at + (event.key.toLowerCase() === "k" ? 1 : -1)];
        if (next) setTime(next.start_ms);
      } else if (event.key === "/") {
        event.preventDefault();
        router.push("/ask");
      } else if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        if (prefs.overrides.paused) prefs.askResume();
        else prefs.pause();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frame, midnight, ordered, prefs, router, segments, time]);

  const fraction = (ms: number) => Math.min(1, Math.max(0, (ms - midnight) / 86_400_000));
  const strip: FrameDetail[] = [];
  let lastSlot = "";
  for (const item of ordered) {
    const asset = frameAsset(item.id);
    if (!asset || asset.slot === lastSlot) continue;
    lastSlot = asset.slot;
    strip.push(item);
  }
  const alt = frame?.caption ?? noDescription(locale);
  const hours = Array.from({ length: 7 }, (_, index) => index * 4);

  return (
    <article className="mx-auto max-w-page px-6 py-8">
      <h1 className="serif text-display">{formatDate(timeline.day, locale)}</h1>
      <div className="mt-6">
        <DayNav day={timeline.day} locale={locale} />
      </div>
      <p className="mt-4 max-w-measure text-sm text-ink-muted">{copy.timelineIntro}</p>
      <p className="mt-2 max-w-measure text-sm">{copy.keyboardHelp}</p>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="relative">
            {paused || !frame || frame.quality !== "ok" ? (
              <FramePlate frameId={null} alt={paused ? copy.pausedPlate : alt} className="aspect-[3/2]" />
            ) : (
              <FramePlate frameId={frame.id} alt={alt} time={formatClock(time, locale)} className="aspect-[3/2]" />
            )}
            <p className="sr-only" data-testid="playhead" aria-live="polite">
              {copy.now} {formatClock(time, locale)}
              {segment ? `, ${segment.title}` : ""}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="min-h-11 border border-rule px-3" onClick={() => {
              const index = frame ? ordered.findIndex((item) => item.id === frame.id) : 0;
              const next = ordered[index - 1];
              if (next) setTime(next.ts_ms);
            }}>
              {copy.prevFrame}
            </button>
            <button type="button" className="min-h-11 border border-rule px-3" onClick={() => {
              const index = frame ? ordered.findIndex((item) => item.id === frame.id) : -1;
              const next = ordered[index + 1];
              if (next) setTime(next.ts_ms);
            }}>
              {copy.nextFrame}
            </button>
            {segment ? <p className="text-sm">{segment.title}{segment.place ? ` · ${segment.place.name}` : ""}</p> : null}
          </div>
          <ul className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label={copy.filmstrip}>
            {strip.map((item) => (
              <li key={item.id}>
                <button type="button" className="w-28 text-left" onClick={() => setTime(item.ts_ms)} aria-current={frame?.id === item.id ? "true" : undefined}>
                  <FramePlate frameId={item.id} alt={item.caption ?? noDescription(locale)} className="aspect-[3/2]" />
                  <span className="mono mt-1 block text-xs">{formatClock(item.ts_ms, locale)}</span>
                </button>
              </li>
            ))}
          </ul>
          {frame && focusId && frame.detection_list.some((item) => item.id === focusId) ? (
            <p className="mt-2 text-sm">
              {copy.focus}
              {frame.detection_list.filter((item) => item.id === focusId).map((item) => (
                <span key={item.id}> · {item.label} {item.certainty === "uncertain" ? <UncertainBadge locale={locale} /> : null}</span>
              ))}
            </p>
          ) : null}
        </div>
        <section className="lg:col-span-4" aria-labelledby="transcript-title">
          <h2 id="transcript-title" className="serif text-2xl">{copy.transcript}</h2>
          <p className="mt-1 text-sm text-ink-muted">{copy.rawAudio}</p>
          <div ref={transcriptRef} className="mt-4 max-h-[32rem] overflow-auto pr-1">
            {utterances.length === 0 ? <p>{copy.emptyTranscript}</p> : null}
            <ol className="flex flex-col gap-3">
              {utterances.map((utterance) => {
                const current = utterance.id === activeUtterance?.id || utterance.id === focusId;
                const name = speakerName(utterance.speaker, locale, utterance.speaker ? prefs.overrides.speakerNames[utterance.speaker.id] : null);
                return (
                  <li key={utterance.id}>
                    <button
                      type="button"
                      data-current={current ? "true" : "false"}
                      className={`w-full px-2 py-2 text-left ${current ? "bg-paper-raised" : ""}`}
                      onClick={() => setTime(utterance.start_ms)}
                    >
                      <span className="mono text-xs">{formatClock(utterance.start_ms, locale)}</span>{" "}
                      <span className="text-sm">{name}</span>
                      {utterance.certainty === "uncertain" ? (
                        <span className="ml-2">
                          <UncertainBadge locale={locale} />
                        </span>
                      ) : null}
                      <span className="mt-1 block">{utterance.text}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>
      <section className="mt-10 border-t border-rule pt-4" aria-label={copy.timeOfDay}>
        <div className="mb-2 flex flex-wrap gap-4 text-xs">
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-6 bg-speech" aria-hidden="true" />{copy.transcript}</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-6 bg-detection" aria-hidden="true" />{copy.objects}</span>
          <span className="inline-flex items-center gap-2"><i className="hatch inline-block h-2 w-6 border border-rule" aria-hidden="true" />{copy.paused}</span>
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label={copy.timeOfDay}
          aria-valuemin={0}
          aria-valuemax={86400000}
          aria-valuenow={Math.round(time - midnight)}
          aria-valuetext={formatClock(time, locale)}
          className="relative h-10 cursor-pointer"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - rect.left) / rect.width;
            setTime(midnight + ratio * 86_400_000);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setTime((current) => Math.min(midnight + 86_400_000, current + (event.shiftKey ? 300_000 : 60_000)));
            if (event.key === "ArrowLeft") setTime((current) => Math.max(midnight, current - (event.shiftKey ? 300_000 : 60_000)));
          }}
        >
          <div className="absolute inset-x-0 top-4 h-2 bg-rule" />
          {utterances.map((utterance) => (
            <span
              key={utterance.id}
              className="absolute top-4 h-2 bg-speech"
              style={{ left: `${fraction(utterance.start_ms) * 100}%`, width: `${Math.max(0.4, fraction(utterance.end_ms) - fraction(utterance.start_ms)) * 100}%` }}
            />
          ))}
          {ordered.flatMap((item) =>
            item.detection_list.filter((detection) => detection.certainty === "confident").map((detection) => (
              <span key={detection.id} className="absolute top-3 h-4 w-1 bg-detection" style={{ left: `${fraction(item.ts_ms) * 100}%` }} />
            )),
          )}
          {timeline.pauses.map((pause) => (
            <span
              key={pause.start_ms}
              className="hatch absolute top-3 h-4"
              style={{ left: `${fraction(pause.start_ms) * 100}%`, width: `${(fraction(pause.end_ms ?? midnight + 86_400_000) - fraction(pause.start_ms)) * 100}%` }}
            />
          ))}
          <span className="absolute top-1 h-6 w-px bg-ink" style={{ left: `${fraction(time) * 100}%` }} />
          <span className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-ink bg-paper" style={{ left: `${fraction(time) * 100}%` }} />
        </div>
        <div className="mono mt-1 flex justify-between text-xs text-ink-muted">
          {hours.map((hour) => (
            <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
          ))}
        </div>
      </section>
    </article>
  );
}
