import Link from "next/link";
import type { LastSeen, Locale } from "@/lib/api/schemas";
import { FramePlate, UncertainBadge } from "@/components/media";
import { t } from "@/lib/i18n";
import { formatClock, formatDate } from "@/lib/time";

export function ObjectsGrid({ items, searchedDays, locale }: { items: LastSeen[]; searchedDays: number; locale: Locale }) {
  const copy = t(locale);
  return (
    <div>
      <p className="text-sm text-ink-muted">
        {searchedDays} {copy.searched}
      </p>
      <ul className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const sighting = item.status === "uncertain" ? item.newer_uncertain : item.last_confident;
          const uncertain = item.status === "uncertain" || item.newer_uncertain !== null;
          return (
            <li key={item.watch_item.id} className={item.status === "uncertain" ? "border border-dashed border-uncertain-rule bg-uncertain-bg p-3 text-uncertain-fg" : ""}>
              <h2 className="serif text-2xl">{item.watch_item.display_name}</h2>
              <p className="mono text-xs text-ink-muted">{item.watch_item.label}</p>
              {item.status === "not_seen" || !sighting ? (
                <div className="mt-3">
                  <FramePlate frameId={null} alt={copy.notSeen} className="aspect-[3/2]" />
                  <p className="mt-3">{copy.notSeen}</p>
                </div>
              ) : (
                <Link href={sighting.open_url} className="mt-3 block no-underline">
                  <FramePlate frameId={sighting.frame_id} alt={sighting.caption ?? item.watch_item.display_name} time={formatClock(sighting.ts_ms, locale)} className="aspect-[3/2]" />
                  <p className="mono mt-2 text-sm">
                    {formatDate(sighting.day, locale)} · {formatClock(sighting.ts_ms, locale)}
                  </p>
                  <p className="text-sm">{sighting.place?.name ?? copy.place}</p>
                  <p className="mono text-sm">
                    {copy.confidence} {sighting.score.toFixed(2)}
                  </p>
                </Link>
              )}
              {uncertain && item.status !== "not_seen" ? (
                <p className="mt-2">
                  <UncertainBadge locale={locale} />
                  {item.newer_uncertain && item.status === "seen" ? <span className="ml-2 text-sm">{copy.newer}</span> : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
