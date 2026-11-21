import Link from "next/link";
import type { Citation, Locale } from "@/lib/api/schemas";
import { frameAsset } from "@/lib/images";
import { t } from "@/lib/i18n";
import { formatClock } from "@/lib/time";

export function UncertainBadge({ locale }: { locale: Locale }) {
  return (
    <span className="badge badge-uncertain">
      <span className="badge-glyph" aria-hidden="true" />
      {t(locale).uncertain}
    </span>
  );
}

export function MissingBadge({ locale }: { locale: Locale }) {
  return <span className="badge badge-missing">{t(locale).notInRecords}</span>;
}

export function FramePlate({
  frameId,
  alt,
  time,
  className = "",
  variant = "full",
  locale,
}: {
  frameId: string | null | undefined;
  alt: string;
  time?: string;
  className?: string;
  variant?: "full" | "thumb";
  locale?: Locale;
}) {
  const asset = frameAsset(frameId);
  const described = alt === "No description" || alt === "无描述" ? "" : alt;
  if (!asset) {
    if (variant === "thumb") {
      return (
        <span className={`plate relative flex aspect-[3/2] items-end overflow-hidden border border-rule bg-paper p-3 ${className}`}>
          <span className="sr-only">{described || alt}</span>
          {time ? <span className="eyebrow">{time}</span> : <span className="eyebrow">{described || alt}</span>}
        </span>
      );
    }
    // No photograph was kept for this frame. Say so visibly — a big blank
    // box reads as a broken image to sighted low-vision readers, and the
    // description must not be screen-reader-only.
    const copy = t(locale ?? "en");
    return (
      <span className={`plate hatch relative flex aspect-[3/2] flex-col justify-between overflow-hidden border border-rule p-4 ${className}`}>
        {time ? <span className="time-chip mono self-start px-2 py-0.5 text-sm">{time}</span> : <span />}
        <span>
          <span className="eyebrow block">{copy.noPhotoKept}</span>
          {described ? <span className="serif mt-2 block text-lg italic leading-snug">{described}</span> : null}
        </span>
      </span>
    );
  }
  const text = described || (locale ? asset.alt[locale] : asset.alt.en);
  return (
    <span className={`relative block overflow-hidden bg-paper ${className}`}>
      <img
        src={variant === "thumb" ? asset.thumb : asset.src}
        srcSet={variant === "full" ? asset.srcSet : undefined}
        sizes={variant === "full" && asset.srcSet ? "(min-width: 64rem) 48rem, 100vw" : undefined}
        alt={text}
        width={asset.width}
        height={asset.height}
        className="h-full w-full object-cover"
      />
      {time ? (
        variant === "full" ? (
          <span className="time-chip mono absolute bottom-2 left-2 px-2 py-0.5 text-sm">{time}</span>
        ) : (
          <span className="time-chip mono absolute left-2 top-2 px-1.5 py-0.5 text-xs">{time}</span>
        )
      ) : null}
    </span>
  );
}

const kindLabel: Record<Citation["kind"], { en: string; "zh-CN": string }> = {
  utterance: { en: "speech", "zh-CN": "语音" },
  caption: { en: "frame", "zh-CN": "画面" },
  ocr: { en: "text in frame", "zh-CN": "画面中的字" },
  detection: { en: "object", "zh-CN": "物件" },
  frame: { en: "frame", "zh-CN": "画面" },
  segment: { en: "stretch", "zh-CN": "一段时间" },
  highlight: { en: "highlight", "zh-CN": "片段" },
  sighting: { en: "sighting", "zh-CN": "看见" },
  day: { en: "day", "zh-CN": "一天" },
};

export function CitationChip({ citation, locale }: { citation: Citation; locale: Locale }) {
  const copy = t(locale);
  const time = formatClock(citation.ts_ms, locale);
  const label = `${copy.citeLabel}, ${time}, ${kindLabel[citation.kind][locale]}`;
  return (
    <Link href={citation.open_url} className="chip" aria-label={label}>
      <FramePlate frameId={citation.frame_id} alt="" time={time} variant="thumb" locale={locale} className="h-14 w-20" />
      <span>
        <span className="mono block text-sm">{time}</span>
        <span className="block text-sm text-ink-muted">{kindLabel[citation.kind][locale]}</span>
      </span>
    </Link>
  );
}

export function CiteMarks({ citations }: { citations: Citation[] }) {
  return (
    <>
      {citations.map((citation, index) => (
        <Link key={`${citation.evidence_id}-${index}`} href={citation.open_url} className="mono ml-0.5 text-sm no-underline">
          <sup>{index + 1}</sup>
          <span className="sr-only">{formatClock(citation.ts_ms, "en")}</span>
        </Link>
      ))}
    </>
  );
}
