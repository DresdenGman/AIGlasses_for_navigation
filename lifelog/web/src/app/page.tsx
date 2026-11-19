import Link from "next/link";
import { ContactSheet } from "@/components/contact-sheet";
import { frameAsset } from "@/lib/images";
import { getClient } from "@/lib/api/client";
import { showcase } from "@/lib/api/showcase";
import { t } from "@/lib/i18n";
import { getUi } from "@/lib/request";
import { FEATURED_DAY, formatNumber } from "@/lib/time";

export default async function YearPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const year = await getClient().getYear();
  const ui = showcase.ui(locale);
  const voices = showcase.testimonials(locale);
  const months = showcase.months();
  const entities = showcase.entities(locale);
  return (
    <article className="mx-auto max-w-page px-4 py-12 md:px-8">
      <p className="eyebrow">{copy.yearEyebrow} / {year.to.slice(0, 4)}</p>
      <h1 className="serif mt-2 text-display">{year.to.slice(0, 4)}</h1>
      <p className="serif mt-4 max-w-measure text-xl italic">{ui.year_line}</p>
      <hr className="mt-8 border-t-2 border-ink" />
      <div className="mt-10">
        <ContactSheet days={year.days} locale={locale} />
      </div>
      <section className="mt-16 border-t border-rule pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="serif text-3xl">{copy.monthsTitle}</h2>
          <Link href={`/day/${FEATURED_DAY}/summary`} className="underline">{copy.readDay}</Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {months.map((month) => {
            const plate = frameAsset(month.frame_id);
            const place = entities.find((entity) => entity.key === month.place);
            const href = month.day === FEATURED_DAY ? `/day/${FEATURED_DAY}/summary` : `/day/${month.day}`;
            return (
              <li key={month.month}>
                <Link href={href} className="block no-underline">
                  <img src={plate?.src ?? "/showcase/placeholders/pending.svg"} alt={plate?.alt[locale] ?? copy.plateLater} width={plate?.width ?? 640} height={plate?.height ?? 480} className="aspect-[3/2] w-full object-cover" />
                </Link>
                <span className="eyebrow mt-2 block">{month.frame_label} · {place?.name ?? month.place}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="mt-16">
        <h2 className="serif text-3xl">{copy.findingsTitle}</h2>
        <ul className="mt-4 max-w-measure space-y-3 text-lg">
          {year.recurring.places.slice(0, 3).map((place) => (
            <li key={place.name.en}>
              {place.name[locale]} · {formatNumber(place.days, locale)} {copy.daysUnit}{" "}
              <Link href={`/day/${FEATURED_DAY}/summary`} className="e-chip">{copy.readDay}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-16">
        <h2 className="serif text-3xl">{copy.recurring}</h2>
        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-3">
          {(["person", "place", "object"] as const).map((kind) => (
            <div key={kind}>
              <h3 className="text-sm">{kind === "person" ? copy.peopleWord : kind === "place" ? copy.placesWord : copy.objectsWord}</h3>
              <ul className="mt-3 space-y-3">
                {entities.filter((entity) => entity.kind === kind).map((entity) => (
                  <li key={entity.id} className="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
                    <span>{entity.name}</span>
                    <span className="mono text-sm">{entity.appearances_days} {copy.daysUnit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-16 border-t border-rule pt-8">
        <h2 className="serif text-3xl">{copy.voicesTitle}</h2>
        <ul className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {voices.map((item) => (
            <li key={item.id} className={item.rating <= 3 ? "border border-rule p-4" : ""}>
              <blockquote>
                <p className="eyebrow">{item.rating} / 5 · {item.date}</p>
                <p className="serif mt-2 text-xl">{item.quote}</p>
                <footer className="mt-3 text-sm">
                  {item.name}, {item.role}
                  <span className="mt-1 block text-ink-muted">{item.title}</span>
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
