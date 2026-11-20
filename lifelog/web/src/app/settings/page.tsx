import { SettingsPanel } from "@/components/settings-panel";
import { getClient } from "@/lib/api/client";
import { showcase } from "@/lib/api/showcase";
import { t } from "@/lib/i18n";
import { getUi } from "@/lib/request";

export default async function SettingsPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const client = getClient();
  const [devices, backup, status] = await Promise.all([
    client.listDevices(),
    client.getBackupConfig(),
    client.getBackupStatus(),
  ]);
  return (
    <article className="mx-auto max-w-page px-6 py-10">
      <h1 className="serif text-display">{copy.settingsTitle}</h1>
      <div className="mt-8">
        <SettingsPanel locale={locale} devices={devices.devices} backup={backup} status={status} runs={showcase.backupRuns()} />
      </div>
    </article>
  );
}
