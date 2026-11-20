import Link from "next/link";
import type { DayInfo, Locale } from "@/lib/api/schemas";
import { DayNav } from "@/components/day-nav";
import { t } from "@/lib/i18n";
import { FEATURED_DAY, formatClock, formatDate, formatNumber, hoursBetween } from "@/lib/time";

export function ArchiveDay({ day, locale }: { day: DayInfo; locale: Locale }) {
  const copy = t(locale);
  const hours = hoursBetween(day.first_ms, day.last_ms);
  return (
    <article className="museum-page mx-auto max-w-page px-6 py-12">
      <DayNav day={day.day} locale={locale} />
      <h1 className="serif mt-8 text-display">{formatDate(day.day, locale)}</h1>
      <p className="mt-6 max-w-measure text-xl">{copy.archiveTitle}</p>
      <p className="mt-3 max-w-measure">{copy.archiveBody}</p>
      <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div>
          <dt className="text-sm">{copy.statHours}</dt>
          <dd className="serif text-3xl">{formatNumber(hours, locale, 1)}</dd>
        </div>
        <div>
          <dt className="text-sm">{copy.framesWord}</dt>
          <dd className="serif text-3xl">{formatNumber(day.frames, locale)}</dd>
        </div>
        <div>
          <dt className="text-sm">{copy.spanLabel}</dt>
          <dd className="mono text-lg">
            {formatClock(day.first_ms, locale)} – {formatClock(day.last_ms, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-sm">{copy.expires}</dt>
          <dd className="mono text-lg">{day.expires_on}</dd>
        </div>
      </dl>
      <p className="mt-8 flex flex-wrap gap-4">
        <Link href="/" className="underline">{copy.backYear}</Link>
        <Link href={`/day/${FEATURED_DAY}/summary`} className="underline">{copy.openFeatured}</Link>
      </p>
    </article>
  );
}
