import { notFound } from "next/navigation";
import { DayNav } from "@/components/day-nav";
import { PeoplePanel } from "@/components/people-panel";
import { getClient } from "@/lib/api/client";
import { ShowcaseNotFound } from "@/lib/api/load";
import { t } from "@/lib/i18n";
import { getUi } from "@/lib/request";

export default async function PeoplePage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const { locale } = await getUi();
  const copy = t(locale);
  const client = getClient();
  try {
    if (!(await client.hasDay(day))) notFound();
    const speakers = await client.listSpeakers(day, locale);
    return (
      <article className="mx-auto max-w-page px-6 py-10">
        <DayNav day={day} locale={locale} />
        <h1 className="serif mt-8 text-display">{copy.peopleTitle}</h1>
        <div className="mt-6">
          <PeoplePanel locale={locale} speakers={speakers.speakers} />
        </div>
      </article>
    );
  } catch (error) {
    if (error instanceof ShowcaseNotFound) notFound();
    throw error;
  }
}
