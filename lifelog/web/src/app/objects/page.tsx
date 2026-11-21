import { ObjectsGrid } from "@/components/objects-grid";
import { getClient } from "@/lib/api/client";
import { t } from "@/lib/i18n";
import { OBJECT_PLATES } from "@/lib/plates";
import { getUi } from "@/lib/request";

export default async function ObjectsPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const seen = await getClient().getLastSeen(locale);
  return (
    <article className="museum-page mx-auto max-w-page px-4 py-12 md:px-8">
      <p className="eyebrow">{copy.objectsEyebrow}</p>
      <h1 className="enter serif mt-5 text-display">{copy.objectsTitle}</h1>
      <p className="mt-5 max-w-measure text-xl leading-snug">{copy.objectsLede}</p>
      <div className="mt-8">
        <ObjectsGrid items={seen.items} searchedDays={seen.searched_days} locale={locale} plates={OBJECT_PLATES} />
      </div>
    </article>
  );
}
