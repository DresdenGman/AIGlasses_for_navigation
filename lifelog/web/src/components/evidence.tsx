"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import type { Citation, FrameDetail, Locale, Utterance } from "@/lib/api/schemas";
import { FramePlate } from "@/components/media";
import { t } from "@/lib/i18n";
import { FEATURED_DAY, formatClock, formatDate } from "@/lib/time";
import { noDescription, speakerName } from "@/lib/text";

type OpenState = { citation: Citation; label: string };

type EvidenceApi = {
  open: (citation: Citation, label: string, trigger: HTMLElement) => void;
};

const EvidenceContext = createContext<EvidenceApi | null>(null);

export function useEvidence(): EvidenceApi {
  const value = useContext(EvidenceContext);
  if (!value) throw new Error("Evidence chips must sit inside the page chrome");
  return value;
}

function silentWavUrl(seconds: number): string {
  const rate = 8000;
  const samples = Math.max(1, Math.floor(rate * seconds));
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

export function EvidenceChip({
  citation,
  n,
  locale,
}: {
  citation: Citation;
  n: number;
  locale: Locale;
}) {
  const evidence = useEvidence();
  const copy = t(locale);
  const time = formatClock(citation.ts_ms, locale);
  const label = citation.handle ?? `E${n}`;
  return (
    <button
      type="button"
      className="e-chip"
      onClick={(event) => evidence.open(citation, label, event.currentTarget)}
    >
      <span aria-hidden="true">
        {label} · {time}
      </span>
      <span className="sr-only">
        {copy.citeLabel} {label}, {time}
      </span>
    </button>
  );
}

export function EvidenceProvider({
  frames,
  utterances,
  locale,
  children,
}: {
  frames: FrameDetail[];
  utterances: Utterance[];
  locale: Locale;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<OpenState | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const api = useMemo<EvidenceApi>(
    () => ({
      open: (citation, label, element) => {
        trigger.current = element;
        setActive({ citation, label });
      },
    }),
    [],
  );
  return (
    <EvidenceContext.Provider value={api}>
      {children}
      <ClipSheet
        active={active}
        frames={frames}
        utterances={utterances}
        locale={locale}
        onClose={() => {
          setActive(null);
          trigger.current?.focus();
        }}
      />
    </EvidenceContext.Provider>
  );
}

function ClipSheet({
  active,
  frames,
  utterances,
  locale,
  onClose,
}: {
  active: OpenState | null;
  frames: FrameDetail[];
  utterances: Utterance[];
  locale: Locale;
  onClose: () => void;
}) {
  const copy = t(locale);
  const waveRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const titleId = useId();
  const citation = active?.citation;
  const nearbyFrames = useMemo(() => {
    if (!citation || citation.day !== FEATURED_DAY) return [];
    const windowed = frames.filter((frame) => Math.abs(frame.ts_ms - citation.ts_ms) <= 10_000 && frame.quality === "ok");
    if (windowed.length > 0) return windowed;
    const nearest = [...frames].filter((frame) => frame.quality === "ok").sort((a, b) => Math.abs(a.ts_ms - citation.ts_ms) - Math.abs(b.ts_ms - citation.ts_ms))[0];
    return nearest ? [nearest] : [];
  }, [citation, frames]);
  const nearbySpeech = useMemo(() => {
    if (!citation) return [];
    return utterances.filter((utterance) => utterance.end_ms >= citation.ts_ms - 15_000 && utterance.start_ms <= citation.ts_ms + 15_000);
  }, [citation, utterances]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [citation?.evidence_id]);

  useEffect(() => {
    if (!citation || !waveRef.current) return;
    const host = waveRef.current;
    let destroyed = false;
    let objectUrl = "";
    let wave: { destroy: () => void } | null = null;
    const start = citation.ts_ms - 15_000;
    const duration = 30;
    const buckets = 90;
    const peaks = Array.from({ length: buckets }, (_, index) => {
      const at = start + (index / buckets) * duration * 1000;
      return nearbySpeech.some((utterance) => at >= utterance.start_ms && at <= utterance.end_ms) ? 0.9 : 0.08;
    });
    objectUrl = silentWavUrl(duration);
    if (audioRef.current) audioRef.current.src = objectUrl;
    void import("media-chrome");
    void import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (destroyed || !host) return;
      wave = WaveSurfer.create({
        container: host,
        height: 48,
        waveColor: "#4A4843",
        progressColor: "#111111",
        cursorColor: "#111111",
        peaks: [peaks],
        duration,
        url: objectUrl,
        interact: true,
        barWidth: 2,
        barGap: 1,
      });
    });
    return () => {
      destroyed = true;
      wave?.destroy();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [citation, nearbySpeech]);

  const shown = nearbyFrames[frameIndex] ?? nearbyFrames[0];
  return (
    <Dialog.Root open={active !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="clip-sheet" aria-labelledby={titleId}>
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title id={titleId} className="eyebrow">
              {copy.clipTitle} {active?.label}
              {citation ? ` · ${citation.day === FEATURED_DAY ? formatClock(citation.ts_ms, locale) : formatDate(citation.day, locale)}` : ""}
            </Dialog.Title>
            <Dialog.Close className="min-h-11 min-w-11 border border-rule px-3">Esc</Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm">{copy.clipAudio}</Dialog.Description>
          {shown ? (
            <FramePlate
              frameId={shown.id}
              alt={shown.caption ?? noDescription(locale)}
              time={formatClock(shown.ts_ms, locale)}
              className="mt-4 aspect-[3/2]"
            />
          ) : citation ? (
            <FramePlate
              frameId={citation.frame_id}
              alt={citation.quote ?? noDescription(locale)}
              time={formatClock(citation.ts_ms, locale)}
              className="mt-4 aspect-[3/2]"
            />
          ) : null}
          <p className="mt-2 text-sm">
            {shown?.caption ? `${shown.caption} (${copy.generated})` : citation?.quote ?? noDescription(locale)}
          </p>
          <div className="mt-4 border border-rule p-2">
            <media-controller audio="">
              <audio
                ref={audioRef}
                slot="media"
                preload="auto"
                onTimeUpdate={(event) => {
                  if (nearbyFrames.length === 0) return;
                  const ratio = event.currentTarget.currentTime / (event.currentTarget.duration || 30);
                  setFrameIndex(Math.min(nearbyFrames.length - 1, Math.floor(ratio * nearbyFrames.length)));
                }}
              />
              <media-control-bar>
                <media-play-button></media-play-button>
                <media-time-range></media-time-range>
                <media-time-display></media-time-display>
              </media-control-bar>
            </media-controller>
            <div ref={waveRef} className="mt-2" />
          </div>
          <ol className="mt-4 max-h-48 space-y-3 overflow-auto">
            {nearbySpeech.map((utterance) => (
              <li key={utterance.id} lang={utterance.lang === "zh" ? "zh-CN" : "en"}>
                <span className="eyebrow">{formatClock(utterance.start_ms, locale)} {speakerName(utterance.speaker, locale)}</span>
                <p className={citation?.quote && utterance.text.includes(citation.quote) ? "underline decoration-2 underline-offset-4" : ""}>
                  {utterance.text}
                </p>
              </li>
            ))}
          </ol>
          {citation ? (
            <p className="mt-4">
              <Link href={citation.open_url} className="underline" onClick={onClose}>
                {t(locale).openTimeline}
              </Link>
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
