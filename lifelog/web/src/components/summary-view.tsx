"use client";

import { useState } from "react";
import Link from "next/link";
import type { DaySummary, FrameDetail, Locale, SummaryItem, Timeline } from "@/lib/api/schemas";
import { DayNav } from "@/components/day-nav";
import { EvidenceChip } from "@/components/evidence";
import { FilmStrip } from "@/components/film-strip";
import { FramePlate, UncertainBadge } from "@/components/media";
import { firstFrameInSlot, frameAsset } from "@/lib/images";
import { t } from "@/lib/i18n";
import { formatClock, formatKawara, formatNumber, formatSpan } from "@/lib/time";
import { noDescription } from "@/lib/text";

export function SummaryView({
  summary,
  frames,
  timeline,
  locale,
}: {
  summary: DaySummary;
  frames: FrameDetail[];
  timeline: Timeline;
  locale: Locale;
}) {
  const copy = t(locale);
  const [time, setTime] = useState(summary.coverage.first_ms ?? frames[0]?.ts_ms ?? 0);
  const highlight = frames.find((frame) => frame.ts_ms === time && frame.quality === "ok")
    ?? frames.find((frame) => frame.quality === "ok")
    ?? null;
  const homeAccents = ["home-desk-packing", "home-hallway-leaving"].flatMap((slot) => {
    const id = firstFrameInSlot(slot);
    const asset = frameAsset(id);
    return id && asset ? [{ id, alt: asset.alt[locale] }] : [];
  });
  const sections: Array<{ eyebrow: string; items: SummaryItem[] }> = [
    { eyebrow: copy.whereEyebrow, items: summary.places },
    { eyebrow: copy.didEyebrow, items: summary.activities },
    { eyebrow: copy.metEyebrow, items: summary.people },
    { eyebrow: copy.saidEyebrow, items: summary.quotes },
  ];
  let n = 1;
  const numberFor = new Map<string, number>();
  const claim = (item: SummaryItem) => {
    const chips = item.citations.map((citation) => {
      const id = `${item.id}-${citation.evidence_id}`;
      if (!numberFor.has(id)) numberFor.set(id, n++);
      return { citation, n: numberFor.get(id) ?? n };
    });
    return chips;
  };
  return (
    <article className="museum-page mx-auto max-w-page px-4 py-12 md:px-8">
      <DayNav day={summary.day} locale={locale} />
      <header className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">{copy.day}</p>
          <h1 className="enter serif mt-3 text-display">{formatKawara(summary.day, locale)}</h1>
          {summary.headline ? <p className="serif mt-6 max-w-measure text-xl italic">{summary.headline.text}</p> : null}
        </div>
        <div className="lg:col-span-4">
          <dl className="eyebrow space-y-3">
            <div>
              <dt>{copy.spanLabel}</dt>
              <dd>{summary.coverage.first_ms ? formatClock(summary.coverage.first_ms, locale) : "—"} – {summary.coverage.last_ms ? formatClock(summary.coverage.last_ms, locale) : "—"}</dd>
            </div>
            <div>
              <dt>{copy.framesWord}</dt>
              <dd>{formatNumber(summary.coverage.frames, locale)} · {formatSpan(summary.coverage.audio_seconds, locale)}</dd>
            </div>
            <div>
              <dt>{copy.expires}</dt>
              <dd>{summary.day.replace("2026", "2027")}</dd>
            </div>
            <div>
              <dt>{copy.validationWord}</dt>
              <dd>{summary.validation.dropped_items} {copy.droppedNote}</dd>
            </div>
          </dl>
          {homeAccents.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {homeAccents.map((accent) => (
                <FramePlate key={accent.id} frameId={accent.id} alt={accent.alt} locale={locale} variant="thumb" className="aspect-[3/2]" />
              ))}
            </div>
          ) : null}
        </div>
      </header>
      {highlight ? (
        <figure className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="frame-mount lg:col-span-9">
            <FramePlate frameId={highlight.id} alt={highlight.caption ?? noDescription(locale)} time={formatClock(highlight.ts_ms, locale)} className="aspect-[3/2]" />
          </div>
          <figcaption className="eyebrow lg:col-span-3">
            {formatClock(highlight.ts_ms, locale)}
            {highlight.place ? ` · ${highlight.place.name}` : ""}
            <span className="mt-2 block normal-case tracking-normal">{highlight.caption} ({copy.generated})</span>
          </figcaption>
        </figure>
      ) : null}
      <div className="mt-8">
        <FilmStrip frames={frames} pauses={timeline.pauses} locale={locale} activeMs={time} onSeek={setTime} />
      </div>
      <div className="mt-16 flex flex-col gap-16">
        {sections.map((section) => (
          <section key={section.eyebrow}>
            <h2 className="eyebrow">{section.eyebrow}</h2>
            <div className="mt-4 flex flex-col gap-8">
              {section.items.map((item) => {
                const chips = claim(item);
                const thumb = item.citations.find((citation) => citation.frame_id)?.frame_id ?? null;
                return (
                  <div key={item.id} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-8 lg:col-start-3">
                      <p className="serif max-w-measure text-lg">
                        {item.text}{" "}
                        {chips.map((chip) => (
                          <EvidenceChip key={`${item.id}-${chip.citation.evidence_id}`} citation={chip.citation} n={chip.n} locale={locale} />
                        ))}
                      </p>
                    </div>
                    <aside className="lg:col-span-2">
                      {thumb && frameAsset(thumb) ? (
                        <FramePlate frameId={thumb} alt="" variant="thumb" locale={locale} className="aspect-[4/3]" />
                      ) : null}
                    </aside>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <section className="mt-24">
        <h2 className="eyebrow">{copy.unsureTitle}</h2>
        {summary.uncertain.length === 0 ? <p className="mt-6">{copy.unsureEmpty}</p> : (
          <ul className="mt-6 flex flex-col gap-6">
            {summary.uncertain.map((item) => {
              const chips = claim(item);
              const best = item.citations.reduce((max, citation) => Math.max(max, citation.score), 0);
              const reason = locale === "zh-CN" ? `证据偏弱（最高 ${best.toFixed(2)}）。` : `Evidence is weak (best match ${best.toFixed(2)}).`;
              return (
                <li key={item.id} className="uncertain-block border border-dashed border-uncertain-rule bg-paper p-5">
                  <UncertainBadge locale={locale} />
                  <p className="mt-3 text-sm text-uncertain-fg">{reason}</p>
                  <p className="mt-3 max-w-measure">
                    <span className="sr-only">{copy.uncertain}: </span>
                    {item.text}{" "}
                    {chips.map((chip) => (
                      <EvidenceChip key={`${item.id}-${chip.citation.evidence_id}`} citation={chip.citation} n={chip.n} locale={locale} />
                    ))}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href={`/day/${summary.day}`} className="inline-flex min-h-11 items-center underline">{copy.openTimeline}</Link>
        <Link href="/ask" className="inline-flex min-h-11 items-center underline">{copy.askThisDay}</Link>
      </p>
    </article>
  );
}
