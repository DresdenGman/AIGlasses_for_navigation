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
}: {
  frameId: string | null | undefined;
  alt: string;
  time?: string;
  className?: string;
}) {
  const asset = frameAsset(frameId);
  if (!asset) {
    return (
      <span className={`plate relative flex aspect-[3/2] items-end overflow-hidden border border-rule bg-paper p-3 ${className}`}>
        <span className="sr-only">{alt}</span>
        {time ? <span className="eyebrow">{time}</span> : <span className="eyebrow">{alt}</span>}
      </span>
    );
  }
  return (
    <span className={`relative block overflow-hidden bg-paper ${className}`}>
      <img src={asset.src} alt={alt} width={asset.width} height={asset.height} className="h-full w-full object-cover" />
      {time ? (
        <span className="time-chip mono absolute left-2 top-2 px-1.5 py-0.5 text-xs">{time}</span>
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
};

export function CitationChip({ citation, locale }: { citation: Citation; locale: Locale }) {
  const copy = t(locale);
  const time = formatClock(citation.ts_ms, locale);
  const label = `${copy.citeLabel}, ${time}, ${kindLabel[citation.kind][locale]}`;
  return (
    <Link href={citation.open_url} className="chip" aria-label={label}>
      <FramePlate frameId={citation.frame_id} alt="" time={time} className="h-14 w-20" />
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
