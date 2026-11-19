import { notFound } from "next/navigation";
import { ArchiveDay } from "@/components/archive-day";
import { TimelineView } from "@/components/timeline-view";
import { getClient } from "@/lib/api/client";
import { ShowcaseNotFound } from "@/lib/api/load";
import { getUi } from "@/lib/request";

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ day: string }>;
  searchParams: Promise<{ t?: string; focus?: string }>;
}) {
  const { day } = await params;
  const query = await searchParams;
  const { locale } = await getUi();
  const client = getClient();
  try {
    const frames = await client.listFrames(day, locale);
    if (frames.frames.length === 0) {
      const info = (await client.getYear()).days.find((item) => item.day === day);
      if (!info) notFound();
      return <ArchiveDay day={info} locale={locale} />;
    }
    const [timeline, utterances, segments] = await Promise.all([
      client.getTimeline(day, locale),
      client.listUtterances(day, locale),
      client.listSegments(day, locale),
    ]);
    const initialT = query.t ? Number(query.t) : undefined;
    return (
      <TimelineView
        timeline={timeline}
        frames={frames.frames}
        utterances={utterances.utterances}
        segments={segments.segments}
        locale={locale}
        initialT={Number.isFinite(initialT) ? initialT : undefined}
        focusId={query.focus}
      />
    );
  } catch (error) {
    if (error instanceof ShowcaseNotFound) notFound();
    throw error;
  }
}
