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
    <article className="mx-auto max-w-page px-6 py-10">
      <h1 className="serif text-display">{copy.objectsTitle}</h1>
      <p className="mt-4 max-w-measure text-xl">{copy.objectsLede}</p>
      <div className="mt-8">
        <ObjectsGrid items={seen.items} searchedDays={seen.searched_days} locale={locale} plates={OBJECT_PLATES} />
      </div>
    </article>
  );
}
