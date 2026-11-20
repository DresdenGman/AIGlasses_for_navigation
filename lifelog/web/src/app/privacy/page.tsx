import { PrivacyPanel } from "@/components/privacy-panel";
import { getClient } from "@/lib/api/client";
import { showcase } from "@/lib/api/showcase";
import { t } from "@/lib/i18n";
import { getUi } from "@/lib/request";

export default async function PrivacyPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const privacy = await getClient().getPrivacy();
  return (
    <article className="mx-auto max-w-page px-6 py-10">
      <h1 className="serif text-display">{copy.privacyTitle}</h1>
      <div className="mt-8">
        <PrivacyPanel locale={locale} baseline={privacy} retentionLine={showcase.ui(locale).retention_line} egressNote={showcase.ui(locale).egress_empty} egress={showcase.egress()} purges={showcase.purges()} />
      </div>
    </article>
  );
}
