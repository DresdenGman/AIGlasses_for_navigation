"use client";

import type { BackupConfig, BackupStatus, Device, Locale } from "@/lib/api/schemas";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { formatDateTime, formatNumber } from "@/lib/time";

const kindName: Record<Device["kind"], { en: string; "zh-CN": string }> = {
  esp32_glasses: { en: "Glasses", "zh-CN": "眼镜" },
  apple_watch: { en: "Watch", "zh-CN": "手表" },
  iphone_relay: { en: "Phone relay", "zh-CN": "手机中继" },
  phone_web: { en: "Phone page", "zh-CN": "手机页面" },
  shortcut: { en: "Shortcut", "zh-CN": "快捷指令" },
};

export function SettingsPanel({
  locale,
  devices,
  backup,
  status,
  runs,
}: {
  locale: Locale;
  devices: Device[];
  backup: BackupConfig;
  status: BackupStatus;
  runs: Array<{ id: string; started_local: string; state: string; files: number; error: string | null }>;
}) {
  const copy = t(locale);
  const prefs = usePrefs();
  const target = prefs.overrides.backupTarget;
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-ink-muted">{copy.showcaseWrites}</p>
      <p className="mt-3 max-w-measure text-sm">{copy.languageNote}</p>
      <section className="mt-10">
        <h2 className="serif text-3xl">{copy.devices}</h2>
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {devices.map((device) => (
            <li key={device.id} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-4">
              <p className="serif text-xl">{kindName[device.kind][locale]}</p>
              <p>
                {copy.battery}{" "}
                <span className="mono">{device.status?.battery_pct == null ? "—" : `${device.status.battery_pct}%`}</span>
              </p>
              <p className="sm:col-span-2">
                {copy.lastSync}{" "}
                <span className="mono">{device.last_seen_ms ? formatDateTime(device.last_seen_ms, locale) : copy.noStatus}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="serif text-3xl">{copy.backup}</h2>
        <div className="mt-4 flex flex-wrap gap-3" role="radiogroup" aria-label={copy.backup}>
          <button
            type="button"
            role="radio"
            aria-checked={target === "nas"}
            className={`min-h-11 border px-4 ${target === "nas" ? "border-ink bg-ink text-paper" : "border-rule"}`}
            onClick={() => prefs.update({ backupTarget: "nas", backupEnabled: true })}
          >
            {copy.nas}
            <span className="mono ml-2 text-sm">{backup.remote}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={target === "cloud"}
            className={`min-h-11 border px-4 ${target === "cloud" ? "border-ink bg-ink text-paper" : "border-rule"}`}
            onClick={() => {
              if (prefs.overrides.localFirst) return;
              prefs.update({ backupTarget: "cloud", backupEnabled: true });
            }}
          >
            {copy.cloud}
          </button>
        </div>
        {prefs.overrides.localFirst ? <p className="mt-3 text-sm">{copy.blocked}</p> : null}
        {status.last_run ? (
          <p className="mono mt-4 text-sm">
            {copy.backupOk} {formatDateTime(status.last_run.finished_ms ?? status.last_run.started_ms, locale)} · {formatNumber(status.last_run.files, locale)} {copy.files}
          </p>
        ) : null}
        <div className="mt-4 max-h-64 overflow-auto" tabIndex={0} role="region" aria-label={copy.backup}>
        <ul className="space-y-1 text-sm">
          {runs.map((run) => (
            <li key={run.id} className={run.state === "failed" ? "text-danger" : ""}>
              <span className="mono">{run.started_local}</span> {run.state} {run.error ? `· ${run.error}` : `· ${run.files} ${copy.files}`}
            </li>
          ))}
        </ul>
        </div>
      </section>
      <p className="mt-10 max-w-measure text-sm text-ink-muted">{copy.jobs}</p>
    </div>
  );
}
