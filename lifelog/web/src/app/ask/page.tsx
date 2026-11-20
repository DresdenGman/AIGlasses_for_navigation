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
  const [prepared, frames, utterances] = await Promise.all([
    client.preparedAsks(locale),
    client.listFrames(FEATURED_DAY, locale),
    client.listUtterances(FEATURED_DAY, locale),
  ]);
  const docs = documentsFromDay(FEATURED_DAY, frames.frames, utterances.utterances);
  return (
    <article className="mx-auto max-w-page px-6 py-10">
      <h1 className="serif text-display">{copy.askTitle}</h1>
      <p className="mt-4 max-w-measure text-xl">{copy.askLede}</p>
      <AskPanel locale={locale} prepared={prepared} docs={docs} />
    </article>
  );
}
