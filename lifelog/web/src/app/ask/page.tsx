import { AskPanel } from "@/components/ask-panel";
import { getClient } from "@/lib/api/client";
import { t } from "@/lib/i18n";
import { getUi } from "@/lib/request";
import { documentsFromDay } from "@/lib/search";
import { FEATURED_DAY } from "@/lib/time";

export default async function AskPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const client = getClient();
  const [prepared, frames, utterances, timeline] = await Promise.all([
    client.preparedAsks(locale),
    client.listFrames(FEATURED_DAY, locale),
    client.listUtterances(FEATURED_DAY, locale),
    client.getTimeline(FEATURED_DAY, locale),
  ]);
  const docs = documentsFromDay(FEATURED_DAY, frames.frames, utterances.utterances);
  return (
    <article className="ask-page mx-auto max-w-page px-6 py-14">
      <header className="ask-intro">
        <p className="eyebrow">Question / evidence</p>
        <h1 className="serif mt-5 text-display">{copy.askTitle}</h1>
        <p className="mt-6 max-w-measure text-xl leading-snug">{copy.askLede}</p>
      </header>
      <div>
      <AskPanel locale={locale} prepared={prepared} docs={docs} pauses={timeline.pauses} />
      </div>
    </article>
  );
}
