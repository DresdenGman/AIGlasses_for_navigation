import { notFound } from "next/navigation";
import { ArchiveDay } from "@/components/archive-day";
import { SummaryView } from "@/components/summary-view";
import { getClient } from "@/lib/api/client";
import { ShowcaseNotFound } from "@/lib/api/load";
import { getUi } from "@/lib/request";

export default async function DaySummaryPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const { locale } = await getUi();
  const client = getClient();
  try {
    const summary = await client.getSummary(day, locale);
    if (!summary) {
      const info = (await client.getYear()).days.find((item) => item.day === day);
      if (!info) notFound();
      return <ArchiveDay day={info} locale={locale} />;
    }
    const [frames, timeline] = await Promise.all([
      client.listFrames(day, locale),
      client.getTimeline(day, locale),
    ]);
    return <SummaryView summary={summary} frames={frames.frames} timeline={timeline} locale={locale} />;
  } catch (error) {
    if (error instanceof ShowcaseNotFound) notFound();
    throw error;
  }
}
