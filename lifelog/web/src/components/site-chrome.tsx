"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Pause } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { FrameDetail, Utterance } from "@/lib/api/schemas";
import { EvidenceProvider } from "@/components/evidence";
import { usePrefs } from "@/lib/prefs";
import { t } from "@/lib/i18n";
import { FEATURED_DAY, formatClock, formatDate } from "@/lib/time";

export function SiteChrome({
  children,
  frames,
  utterances,
  consentMs,
  lastSyncMs,
}: {
  children: React.ReactNode;
  frames: FrameDetail[];
  utterances: Utterance[];
  consentMs: number | null;
  lastSyncMs: number | null;
}) {
  const prefs = usePrefs();
  const copy = t(prefs.locale);
  const path = usePathname();
  const links = [
    ["/", copy.year],
    [`/day/${FEATURED_DAY}/summary`, copy.day],
    [`/day/${FEATURED_DAY}`, copy.timeline],
    ["/ask", copy.ask],
    ["/objects", copy.objects],
    ["/privacy", copy.privacy],
  ] as const;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!prefs.overrides.paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [prefs.overrides.paused]);
  const elapsed = prefs.overrides.pausedAt ? Math.max(0, Math.floor((now - prefs.overrides.pausedAt) / 1000)) : 0;
  const clock = [Math.floor(elapsed / 3600), Math.floor((elapsed % 3600) / 60), elapsed % 60].map((part) => String(part).padStart(2, "0")).join(":");
  const consent = consentMs ? formatDate(new Date(consentMs).toISOString().slice(0, 10), prefs.locale) : "—";
  const sync = lastSyncMs ? formatClock(lastSyncMs, prefs.locale) : "—";
  return (
    <EvidenceProvider frames={frames} utterances={utterances} locale={prefs.locale}>
      <a className="skip" href="#content">{copy.skip}</a>
      <header className="border-b border-rule">
        <div className="mx-auto flex min-h-14 max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <TimelineGlyph />
            <span className="serif text-xl tracking-tight">Lifelog</span>
          </Link>
          <nav aria-label={copy.navLabel} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className="inline-flex min-h-11 items-center no-underline">
                {label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className={`inline-flex min-h-11 items-center gap-2 border border-ink px-3 ${prefs.overrides.paused ? "hatch" : "bg-ink text-paper"}`}
            onClick={() => (prefs.overrides.paused ? prefs.askResume() : prefs.pause())}
          >
            <Pause aria-hidden="true" size={16} strokeWidth={1.5} />
            {prefs.overrides.paused ? `${copy.paused} · ${clock} · ${copy.resume}` : copy.pause}
          </button>
        </div>
        <p className="status-line" aria-live={prefs.overrides.paused ? "assertive" : "polite"}>
          <Link href="/privacy">{prefs.overrides.paused ? `${copy.paused} · ${formatClock(prefs.overrides.pausedAt ?? now, prefs.locale)}` : prefs.overrides.localFirst ? "LOCAL-FIRST ON" : "LOCAL-FIRST OFF"}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy">{prefs.overrides.audioEnabled ? `AUDIO ON` : "AUDIO OFF"} {consent}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy">{prefs.overrides.locationEnabled ? "LOCATION ON" : "LOCATION OFF"}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy">{copy.keepDays} {prefs.overrides.retentionDays}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/settings">{copy.lastSync} {sync}</Link>
          <span className="ml-auto flex flex-wrap gap-2">
            <button type="button" className="min-h-11 px-2" aria-pressed={prefs.locale === "zh-CN"} onClick={() => prefs.setLocale("zh-CN")}>{copy.chinese}</button>
            <button type="button" className="min-h-11 px-2" aria-pressed={prefs.locale === "en"} onClick={() => prefs.setLocale("en")}>{copy.english}</button>
            <button type="button" className="min-h-11 px-2" onClick={() => prefs.setTheme(prefs.theme === "dark" ? "light" : "dark")}>{prefs.theme === "dark" ? copy.themeToLight : copy.themeToDark}</button>
            <button type="button" className="min-h-11 px-2" aria-pressed={prefs.large} onClick={prefs.toggleLarge}>{prefs.large ? copy.largeOn : copy.largeOff}</button>
          </span>
        </p>
      </header>
      <main id="content">{children}</main>
      <footer className="mt-24 border-t border-rule">
        <p className="mx-auto flex max-w-page flex-wrap gap-4 px-4 py-8 text-sm md:px-8">
          <span>{copy.ethic}</span>
          <Link href="/about" className="underline">{copy.about}</Link>
          <Link href="/settings" className="underline">{copy.settings}</Link>
        </p>
      </footer>
      <ConfirmDialog />
    </EvidenceProvider>
  );
}

function TimelineGlyph() {
  return (
    <svg width="54" height="16" viewBox="0 0 54 16" aria-hidden="true" className="text-ink">
      <line x1="2" y1="8" x2="52" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="4" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="27" cy="8" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="44" y1="4" x2="44" y2="12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ConfirmDialog() {
  const prefs = usePrefs();
  const copy = t(prefs.locale);
  const [ack, setAck] = useState(false);
  const open = prefs.dialog !== null;
  const title = prefs.dialog === "resume" ? copy.resumeTitle : prefs.dialog === "cloud" ? copy.confirmCloudTitle : copy.audio;
  const body = prefs.dialog === "resume" ? copy.resumeBody : prefs.dialog === "cloud" ? copy.confirmCloudBody : copy.audioHelp;
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) { setAck(false); prefs.closeDialog(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="serif text-2xl">{title}</Dialog.Title>
          <Dialog.Description className="mt-3">{body}</Dialog.Description>
          {prefs.dialog === "audio" ? (
            <label className="mt-4 flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={ack} onChange={(event) => setAck(event.target.checked)} />
              <span>{copy.consent}</span>
            </label>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="min-h-11 border border-ink bg-ink px-4 text-paper disabled:opacity-40"
              disabled={prefs.dialog === "audio" && !ack}
              onClick={() => {
                if (prefs.dialog === "resume") prefs.confirmResume();
                if (prefs.dialog === "cloud") prefs.confirmCloudOff();
                if (prefs.dialog === "audio") prefs.confirmAudio();
                setAck(false);
              }}
            >
              {prefs.dialog === "audio" ? copy.enableAudio : copy.confirm}
            </button>
            <Dialog.Close className="min-h-11 border border-rule px-4">{copy.cancel}</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
