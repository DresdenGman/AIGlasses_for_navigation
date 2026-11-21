import Link from "next/link";
import { ContactSheet } from "@/components/contact-sheet";
import { WordHighlight } from "@/components/word-highlight";
import { getClient } from "@/lib/api/client";
import { showcase } from "@/lib/api/showcase";
import { t } from "@/lib/i18n";
import { MONTH_PLATES, YEAR_HERO, plateAlt } from "@/lib/plates";
import { getUi } from "@/lib/request";
import { FEATURED_DAY, formatNumber } from "@/lib/time";
import { withBasePath } from "@/lib/base-path";

export default async function YearPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const year = await getClient().getYear();
  const ui = showcase.ui(locale);
  const voices = showcase.testimonials(locale);
  const months = showcase.months();
  const entities = showcase.entities(locale);
  const stats = showcase.stats();
  const critical = voices.find((voice) => voice.rating <= 2) ?? voices.find((voice) => voice.rating <= 3);
  const curated = [
    ...voices.filter((voice) => voice.rating >= 4 && voice.id !== critical?.id).slice(0, 5),
    ...(critical ? [critical] : []),
  ];
  const findings = stats.top_places.slice(0, 3);
  return (
    <article className="museum-page">
      <header className="archive-hero mx-auto grid max-w-page grid-cols-1 gap-8 px-4 pb-8 pt-10 md:px-8 lg:grid-cols-12 lg:pt-16">
        <div className="enter-media lg:col-span-8">
          <img src={YEAR_HERO.src} alt={plateAlt(YEAR_HERO, locale)} width={1536} height={1024} className="archive-hero-image plate aspect-[3/2] w-full object-cover" />
        </div>
        <div className="archive-intro flex flex-col justify-between gap-10 lg:col-span-4">
          <div className="enter">
            <p className="eyebrow">Archive / 01 · Edition {year.to.slice(0, 4)}</p>
            <p className="eyebrow mt-2">{copy.yearEyebrow} / {year.to.slice(0, 4)}</p>
          </div>
          <div className="enter enter-1">
            <h1 className="archive-year serif mt-4 text-display">{year.to.slice(0, 4)}</h1>
            <p className="serif mt-6 text-xl italic leading-snug">{ui.year_line}</p>
            <p className="mt-8">
              <Link href={`/day/${FEATURED_DAY}/summary`} className="editorial-link inline-flex min-h-11 items-center">{copy.readDay}</Link>
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-24 max-w-page px-4 md:px-8" aria-labelledby="contact-sheet-title">
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <h2 id="contact-sheet-title" className="eyebrow lg:col-span-3">{copy.gridView}</h2>
          <p className="max-w-measure lg:col-span-6">{copy.heatmapLabel}</p>
        </div>
        <ContactSheet days={year.days} locale={locale} />
        <dl className="mt-10 grid grid-cols-2 gap-8 border-t border-rule pt-8 lg:grid-cols-6">
          <div>
            <dt className="eyebrow">{copy.framesWord}</dt>
            <dd className="serif mt-2 text-3xl">{formatNumber(stats.frames, locale)}</dd>
          </div>
          <div>
            <dt className="eyebrow">{copy.speechWord}</dt>
            <dd className="serif mt-2 text-3xl">{formatNumber(stats.audio_hours, locale, 0)}</dd>
          </div>
          <div>
            <dt className="eyebrow">{copy.statQuestions}</dt>
            <dd className="serif mt-2 text-3xl">{formatNumber(stats.questions_asked, locale)}</dd>
          </div>
          <div>
            <dt className="eyebrow">{copy.statObjects}</dt>
            <dd className="serif mt-2 text-3xl">{formatNumber(stats.objects_found, locale)}</dd>
          </div>
          <div className="border border-dashed border-uncertain-rule bg-uncertain-bg px-4 py-3">
            <dt className="eyebrow text-uncertain-fg">{copy.statUncertainDays}</dt>
            <dd className="serif mt-2 text-3xl text-uncertain-fg">{formatNumber(stats.days_with_uncertain, locale)}</dd>
          </div>
          <div className="border border-dashed border-uncertain-rule bg-uncertain-bg px-4 py-3">
            <dt className="eyebrow text-uncertain-fg">{copy.statUncertainItems}</dt>
            <dd className="serif mt-2 text-3xl text-uncertain-fg">{formatNumber(stats.uncertain_items, locale)}</dd>
          </div>
        </dl>
      </section>

      <section className="mx-auto mt-24 max-w-page px-4 md:px-8" aria-labelledby="capabilities-title">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 id="capabilities-title" className="eyebrow">{copy.loopTitle}</h2>
          </div>
          <div className="lg:col-span-9">
            <p className="serif max-w-measure text-2xl leading-snug">
              <WordHighlight text={copy.loopStatement} locale={locale} />
            </p>
            <ul className="mt-8 grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2">
              {copy.caps.map(([title, description], index) => {
                const href = [
                  `/day/${FEATURED_DAY}`,
                  "/settings",
                  `/day/${FEATURED_DAY}/summary`,
                  `/day/${FEATURED_DAY}`,
                  "/ask",
                  "/objects",
                  "/ask",
                  "/privacy",
                ][index];
                return (
                  <li key={title} className="cap-card card-lift flex bg-paper p-6">
                    <Link href={href} className="flex w-full flex-col no-underline">
                      <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="serif mt-4 text-2xl">{title}</h3>
                      <p className="mt-2 text-sm text-ink-muted">{description}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-5 max-w-measure text-sm text-ink-muted">{copy.loopNote}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-page px-4 md:px-8" aria-labelledby="months-title">
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <h2 id="months-title" className="eyebrow lg:col-span-3">{copy.monthsTitle}</h2>
        </div>
        <ul className="archive-months grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {months.map((month) => {
            const photo = MONTH_PLATES[month.month];
            const href = month.day === FEATURED_DAY ? `/day/${FEATURED_DAY}/summary` : `/day/${month.day}`;
            return (
              <li key={month.month}>
                <Link href={href} className="month-plate no-underline">
                  <img
                    src={photo?.src ?? withBasePath("/showcase/placeholders/pending.svg")}
                    alt={photo ? plateAlt(photo, locale) : copy.plateLater}
                    width={1536}
                    height={1024}
                    className="plate aspect-[3/2] w-full object-cover"
                  />
                </Link>
                <p className="eyebrow mt-3">{month.frame_label}</p>
                <p className="mt-1 max-w-[22rem] text-sm">{photo ? plateAlt(photo, locale) : copy.plateLater}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto mt-24 max-w-page px-4 md:px-8" aria-labelledby="review-title">
        <h2 id="review-title" className="eyebrow">{copy.findingsTitle}</h2>
        <ol className="mt-10 flex flex-col">
          {findings.map((finding, index) => {
            const place = entities.find((entity) => entity.key === finding.place);
            const maxDays = Math.max(...findings.map((item) => item.days), 1);
            return (
              <li key={finding.place} className="grid grid-cols-1 gap-4 border-t border-rule py-8 lg:grid-cols-12">
                <p className="eyebrow lg:col-span-2">{String(index + 1).padStart(2, "0")}</p>
                <div className="lg:col-span-7">
                  <p className="serif text-2xl leading-snug">
                    {place?.name ?? finding.place}
                    <span className="mt-2 block text-xl italic">{formatNumber(finding.days, locale)} {copy.daysUnit}</span>
                  </p>
                  <span className="mt-4 block h-1 bg-accent" style={{ width: `${Math.max(4, (finding.days / maxDays) * 100)}%` }} aria-hidden="true" />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mx-auto mt-24 max-w-page px-4 pb-8 md:px-8" aria-labelledby="voices-title">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="voices-title" className="eyebrow">{copy.voicesTitle}</h2>
          <Link href="/voices" className="editorial-link inline-flex min-h-11 items-center">{copy.readAllVoices}</Link>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-2">
          {curated.map((voice, index) => (
            <li key={voice.id} className="border-t border-rule pt-6">
              <p className="eyebrow">Note {String(index + 1).padStart(2, "0")}</p>
              <blockquote className="mt-4">
                <p className="serif text-[1.1875rem] leading-[1.55]">{voice.quote}</p>
                <footer className="eyebrow mt-6">
                  {voice.name} · {voice.role}
                  {voice.rating <= 3 ? ` · ${voice.rating} / 5` : ""}
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
