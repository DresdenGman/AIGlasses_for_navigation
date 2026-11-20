"use client";

import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import type { Locale, PrivacySettings } from "@/lib/api/schemas";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { formatDateTime, formatNumber } from "@/lib/time";

function formatBytes(bytes: number, locale: Locale): string {
  if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
  return `${formatNumber(bytes / 1024, locale, 1)} KB`;
}

export function PrivacyPanel({
  locale,
  baseline,
  retentionLine,
  egressNote,
  egress,
  purges,
}: {
  locale: Locale;
  baseline: PrivacySettings;
  retentionLine: string;
  egressNote: string;
  egress: Array<{ id: string; ts_local: string; purpose: string; bytes_out: number; day: string | null }>;
  purges: Array<{ id: string; ts_local: string; trigger: string; days: string[]; frames: number }>;
}) {
  const copy = t(locale);
  const prefs = usePrefs();
  const state = prefs.overrides;
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-ink-muted">{copy.showcaseWrites}</p>
      <section className="mt-8">
        <h2 className="serif text-3xl">{copy.pauseNow}</h2>
        <p className="mt-3 max-w-measure">{copy.pauseHelp}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="min-h-11 border border-rule px-4" onClick={() => prefs.pauseFor(15 * 60)}>{copy.fifteen}</button>
          <button type="button" className="min-h-11 border border-rule px-4" onClick={() => prefs.pauseFor(60 * 60)}>{copy.oneHour}</button>
          <button type="button" className="min-h-11 border border-ink px-4" onClick={() => (state.paused ? prefs.askResume() : prefs.pause())}>{copy.untilResume}</button>
        </div>
      </section>
      <section className="mt-8 border border-ink p-6">
        <h2 className="serif text-3xl">{state.paused ? copy.paused : copy.pause}</h2>
        <button
          type="button"
          className="mt-6 min-h-14 border border-ink bg-ink px-6 text-lg text-paper"
          onClick={() => (state.paused ? prefs.askResume() : prefs.pause())}
        >
          {state.paused ? copy.resume : copy.pause}
        </button>
        <p className="mt-4 text-sm" role="status">
          {state.paused ? copy.pausedBanner : state.audioEnabled ? copy.recording : copy.audioOff}
        </p>
      </section>
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm">{copy.retention}</h2>
          <p className="serif text-3xl">
            {state.retentionDays} {copy.days}
          </p>
        </div>
        <Slider.Root
          className="slider mt-4"
          min={1}
          max={365}
          step={1}
          value={[state.retentionDays]}
          onValueChange={(value) => prefs.update({ retentionDays: value[0] ?? state.retentionDays })}
          aria-label={copy.retention}
        >
          <Slider.Track className="slider-track">
            <Slider.Range className="slider-range" />
          </Slider.Track>
          <Slider.Thumb className="slider-thumb" aria-label={copy.retention} />
        </Slider.Root>
        <p className="mt-3 max-w-measure text-sm">{copy.retentionHelp}</p>
        <p className="mt-2 max-w-measure text-sm">{retentionLine}</p>
        <p className="mono mt-2 text-sm">
          {copy.nextPurge} {formatDateTime(baseline.next_purge_ms, locale)}
        </p>
      </section>
      <section className="mt-6">
        <Toggle
          id="local-first"
          label={copy.localFirst}
          checked={state.localFirst}
          onChange={(on) => {
            if (on) prefs.update({ localFirst: true, backupTarget: "nas" });
            else prefs.requestCloudOff();
          }}
        />
        <p className="max-w-measure text-sm">{state.localFirst ? copy.localFirstOn : copy.localFirstOff}</p>
        <Toggle
          id="audio"
          label={copy.audio}
          checked={state.audioEnabled}
          onChange={(on) => {
            if (!on) prefs.update({ audioEnabled: false });
            else prefs.requestAudio();
          }}
        />
        <p className="max-w-measure text-sm">{copy.audioHelp}</p>
        <Toggle id="faces" label={copy.faceBlur} checked={state.faceBlur} onChange={(on) => prefs.update({ faceBlur: on })} />
        <Toggle id="location" label={copy.location} checked={state.locationEnabled} onChange={(on) => prefs.update({ locationEnabled: on })} />
        <Toggle id="raw" label={copy.keepRaw} checked={state.keepRawAudio} onChange={(on) => prefs.update({ keepRawAudio: on })} />
        <Toggle id="vision" label={copy.cloudVision} checked={state.cloudVision && !state.localFirst} onChange={(on) => prefs.update({ cloudVision: on })} />
        <p className="max-w-measure text-sm">{copy.cloudVisionHelp}</p>
      </section>
      <section className="mt-10">
        <h2 className="serif text-2xl">{copy.ledger}</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="py-2 pr-4 font-normal" scope="col">{copy.setting}</th>
              <th className="py-2 pr-4 font-normal" scope="col">{copy.nowCol}</th>
              <th className="py-2 pr-4 font-normal" scope="col">{copy.defaultWord}</th>
              <th className="py-2 font-normal" scope="col">{copy.means}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule"><th className="py-3 pr-4 text-left font-normal" scope="row">{copy.localFirst}</th><td className="pr-4">{state.localFirst ? "on" : "off"}</td><td className="pr-4">on</td><td>{copy.localFirstOn}</td></tr>
            <tr className="border-b border-rule"><th className="py-3 pr-4 text-left font-normal" scope="row">{copy.retention}</th><td className="pr-4">{state.retentionDays}</td><td className="pr-4">14</td><td>{retentionLine}</td></tr>
            <tr className="border-b border-rule"><th className="py-3 pr-4 text-left font-normal" scope="row">{copy.audio}</th><td className="pr-4">{state.audioEnabled ? "on" : "off"}</td><td className="pr-4">off</td><td>{copy.audioHelp}</td></tr>
          </tbody>
        </table>
        <h2 className="serif mt-10 text-2xl">{egressNote}</h2>
        <div className="mt-3 max-h-64 overflow-auto" tabIndex={0} role="region" aria-label={egressNote}>
          <table className="w-full text-sm">
            <tbody>
              {egress.slice(-8).map((row) => {
                const tsMs = Date.parse(row.ts_local);
                return (
                  <tr key={row.id} className="border-t border-rule">
                    <td className="mono py-2 pr-4">{Number.isNaN(tsMs) ? row.ts_local : formatDateTime(tsMs, locale)}</td>
                    <td className="pr-4">{row.purpose}</td>
                    <td className="mono pr-4">{formatBytes(row.bytes_out, locale)}</td>
                    <td>{row.day}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h2 className="serif mt-8 text-2xl">{copy.deletedDays}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {purges.map((row) => {
            const tsMs = Date.parse(row.ts_local);
            return (
              <li key={row.id} className="mono">{Number.isNaN(tsMs) ? row.ts_local : formatDateTime(tsMs, locale)} · {row.trigger} · {row.days.join(", ")} · {formatNumber(row.frames, locale)}</li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="field">
      <label htmlFor={id} className="max-w-measure">
        {label}
      </label>
      <Switch.Root id={id} className="switch" checked={checked} onCheckedChange={onChange}>
        <Switch.Thumb className="switch-thumb" />
      </Switch.Root>
    </div>
  );
}
