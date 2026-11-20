import Link from "next/link";
import { ContactSheet } from "@/components/contact-sheet";
import { getClient } from "@/lib/api/client";
import { showcase } from "@/lib/api/showcase";
import { t } from "@/lib/i18n";
import { MONTH_PLATES, YEAR_HERO, plateAlt } from "@/lib/plates";
import { getUi } from "@/lib/request";
import { FEATURED_DAY, formatNumber } from "@/lib/time";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
    <article>
      <header className="archive-hero mx-auto grid max-w-page grid-cols-1 gap-8 px-4 pb-8 pt-10 md:px-8 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-8">
          <img src={YEAR_HERO.src} alt={plateAlt(YEAR_HERO, locale)} width={1536} height={1024} className="archive-hero-image plate aspect-[3/2] w-full object-cover" />
        </div>
        <div className="flex flex-col justify-end lg:col-span-4">
          <p className="eyebrow">{copy.yearEyebrow} / {year.to.slice(0, 4)}</p>
          <h1 className="archive-year serif mt-4 text-display">{year.to.slice(0, 4)}</h1>
          <p className="serif mt-6 text-xl italic leading-snug">{ui.year_line}</p>
          <p className="mt-8">
            <Link href={`/day/${FEATURED_DAY}/summary`} className="inline-flex min-h-11 items-center underline">{copy.readDay}</Link>
          </p>
        </div>
      </header>

      <section className="mx-auto mt-24 max-w-page px-4 md:px-8" aria-labelledby="contact-sheet-title">
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <h2 id="contact-sheet-title" className="eyebrow lg:col-span-3">{copy.gridView}</h2>
          <p className="max-w-measure lg:col-span-6">{copy.heatmapLabel}</p>
        </div>
        <ContactSheet days={year.days} locale={locale} />
        <dl className="mt-10 grid grid-cols-2 gap-8 border-t border-rule pt-8 lg:grid-cols-4">
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
        </dl>
      </section>

      <section className="mx-auto mt-24 max-w-page px-4 md:px-8" aria-labelledby="capabilities-title">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 id="capabilities-title" className="eyebrow">The complete loop</h2>
          </div>
          <div className="lg:col-span-9">
            <p className="serif max-w-measure text-2xl leading-snug">
              Capture, keep, understand, and find a moment again — with uncertainty visible at every step.
            </p>
            <ul className="mt-8 grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2">
              {[
                ["01", "Timed capture", "A five-minute frame rhythm and watch transcript form the day.", `/day/${FEATURED_DAY}`],
                ["02", "Cloud or NAS backup", "A visible backup ledger keeps the destination and failures explicit.", "/settings"],
                ["03", "Daily summary", "Places, activities, people, and speech are arranged into a readable day.", `/day/${FEATURED_DAY}/summary`],
                ["04", "Timeline playback", "Scrub the full day, jump to a frame, or follow the transcript.", `/day/${FEATURED_DAY}`],
                ["05", "Evidence-first answers", "Ask a question and open the exact cited moment.", "/ask"],
                ["06", "Last-seen objects", "Search watched objects without turning a weak sighting into certainty.", "/objects"],
                ["07", "Uncertainty markers", "Weak evidence is labeled instead of being polished into a claim.", "/ask"],
                ["08", "Privacy controls", "Pause capture, choose retention, and keep the record local-first.", "/privacy"],
              ].map(([number, title, description, href]) => (
                <li key={number} className="bg-paper p-5">
                  <Link href={href} className="block no-underline">
                    <span className="eyebrow">{number}</span>
                    <h3 className="serif mt-4 text-2xl">{title}</h3>
                    <p className="mt-2 text-sm text-ink-muted">{description}</p>
                    <span className="mt-5 inline-block text-sm underline">Open view</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-measure text-sm text-ink-muted">
              This public page is a synthetic showcase. The interface and contracts are implemented; live camera,
              Apple Watch, storage credentials, and model keys still need to be connected for a real deployment.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-24" aria-labelledby="months-title">
        <div className="mx-auto mb-8 grid max-w-page grid-cols-1 gap-4 px-4 md:px-8 lg:grid-cols-12">
          <h2 id="months-title" className="eyebrow lg:col-span-3">{copy.monthsTitle}</h2>
        </div>
        <ul className="archive-months flex gap-6 overflow-x-auto px-4 pb-4 md:px-8">
          {months.map((month) => {
            const photo = MONTH_PLATES[month.month];
            const href = month.day === FEATURED_DAY ? `/day/${FEATURED_DAY}/summary` : `/day/${month.day}`;
            return (
              <li key={month.month} className="w-[min(78vw,22rem)] shrink-0">
                <Link href={href} className="block no-underline">
                  <img
                    src={photo?.src ?? `${basePath}/showcase/placeholders/pending.svg`}
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
        <ol className="mt-10 flex flex-col gap-16">
          {findings.map((finding, index) => {
            const place = entities.find((entity) => entity.key === finding.place);
            return (
              <li key={finding.place} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <p className="eyebrow lg:col-span-2">{String(index + 1).padStart(2, "0")}</p>
                <p className="serif text-2xl leading-snug lg:col-span-7">
                  {place?.name ?? finding.place}
                  <span className="mt-2 block text-xl italic">{formatNumber(finding.days, locale)} {copy.daysUnit}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mx-auto mt-24 max-w-page px-4 pb-8 md:px-8" aria-labelledby="voices-title">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="voices-title" className="eyebrow">{copy.voicesTitle}</h2>
          <Link href="/voices" className="inline-flex min-h-11 items-center underline">{copy.readAllVoices}</Link>
        </div>
        <ul className="mt-12 flex flex-col gap-20">
          {curated.map((voice) => (
            <li key={voice.id} className="grid grid-cols-1 lg:grid-cols-12">
              <blockquote className="lg:col-span-8 lg:col-start-3">
                <p className="serif text-2xl leading-snug">{voice.quote}</p>
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
