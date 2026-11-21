import Link from "next/link";
import type { LastSeen, Locale } from "@/lib/api/schemas";
import { FramePlate, UncertainBadge } from "@/components/media";
import { t } from "@/lib/i18n";
import type { Plate } from "@/lib/plates";
import { plateAlt } from "@/lib/plates";
import { formatClock, formatDate } from "@/lib/time";

export function ObjectsGrid({
  items,
  searchedDays,
  locale,
  plates,
}: {
  items: LastSeen[];
  searchedDays: number;
  locale: Locale;
  plates: Record<string, Plate>;
}) {
  const copy = t(locale);
  return (
    <div>
      <p className="max-w-measure">{copy.foundBy}</p>
      <p className="mt-2 text-sm text-ink-muted">
        {searchedDays} {copy.searched}
      </p>
      <ul className="object-archive mt-12">
        {items.map((item) => {
          const sighting = item.last_confident ?? item.newer_uncertain;
          const low = item.newer_uncertain;
          const plate = plates[item.watch_item.label];
          return (
            <li key={item.watch_item.id} className={low ? "border border-dashed border-uncertain-rule bg-paper p-4" : ""}>
              <h2 className="serif text-3xl">{item.watch_item.display_name}</h2>
              <p className="eyebrow mt-2">{item.watch_item.label}</p>
              {item.status === "not_seen" || !sighting ? (
                <div className="mt-4">
                  <FramePlate frameId={null} alt="" locale={locale} className="aspect-[3/2]" />
                  <p className="mt-3">{copy.notSeen}</p>
                </div>
              ) : (
                <Link href={sighting.open_url} className="mt-4 block no-underline">
                  {plate ? (
                    <span className="block overflow-hidden">
                      <img src={plate.src} alt={plateAlt(plate, locale)} width={1536} height={1024} className="plate aspect-[3/2] w-full object-cover" />
                    </span>
                  ) : (
                    <FramePlate frameId={sighting.frame_id} alt={sighting.caption ?? item.watch_item.display_name} time={formatClock(sighting.ts_ms, locale)} locale={locale} className="aspect-[3/2]" />
                  )}
                  <p className="eyebrow mt-3">{formatDate(sighting.day, locale)} · {formatClock(sighting.ts_ms, locale)}</p>
                  <p className="mt-1">{sighting.place?.name ?? copy.place}</p>
                  <p className="mono text-sm">{copy.confidence} {sighting.score.toFixed(2)}</p>
                </Link>
              )}
              {low ? (
                <p className="mt-4">
                  <UncertainBadge locale={locale} />
                  <span className="mt-2 block text-sm text-uncertain-fg">
                    {copy.newer} {low.score.toFixed(2)} · {low.place?.name}
                  </span>
                  {item.last_confident ? (
                    <span className="mt-2 block border-t border-dashed border-uncertain-rule pt-2 text-sm text-uncertain-fg">
                      {copy.newerNote}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
