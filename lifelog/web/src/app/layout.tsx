import type { Metadata } from "next";
import tokens from "../../design-tokens.json";
import { SiteChrome } from "@/components/site-chrome";
import { getClient } from "@/lib/api/client";
import { FEATURED_DAY } from "@/lib/time";
import { fontClassName } from "@/lib/fonts";
import { PrefsProvider, type ShowcaseOverrides } from "@/lib/prefs";
import { getUi } from "@/lib/request";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3456"),
  title: { default: "Lifelog", template: "%s · Lifelog" },
  description: "One day, remembered — with receipts.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Lifelog",
    description: "One day, remembered — with receipts.",
    images: [{ url: "/showcase/brand/og-image.jpg", width: 1600, height: 839, alt: "Lifelog" }],
  },
};

function colorVars(colors: Record<string, string>): string {
  return Object.entries(colors)
    .map(([key, value]) => `--${key}:${value}`)
    .join(";");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ui = await getUi();
  const client = getClient();
  const [privacy, backup, devices, frames, utterances] = await Promise.all([
    client.getPrivacy(),
    client.getBackupConfig(),
    client.listDevices(),
    client.listFrames(FEATURED_DAY, ui.locale),
    client.listUtterances(FEATURED_DAY, ui.locale),
  ]);
  const lastSync = devices.devices.reduce<number | null>((latest, device) => {
    if (device.last_seen_ms === null) return latest;
    return latest === null ? device.last_seen_ms : Math.max(latest, device.last_seen_ms);
  }, null);
  const initialOverrides: ShowcaseOverrides = {
    paused: privacy.capture_paused,
    retentionDays: privacy.retention_days,
    localFirst: privacy.local_first,
    audioEnabled: privacy.audio_enabled,
    faceBlur: privacy.face_blur,
    locationEnabled: privacy.location_enabled,
    keepRawAudio: privacy.keep_raw_audio,
    cloudVision: privacy.cloud_vision_enabled,
    backupEnabled: backup.enabled,
    backupTarget: backup.target_type === "cloud" ? "cloud" : "nas",
    speakerNames: {},
    pausedAt: null,
  };
  const light = colorVars(tokens.color.light);
  const dark = colorVars(tokens.color.dark);
  return (
    <html lang={ui.locale} className={ui.theme === "dark" ? "dark" : undefined} data-large={ui.large ? "1" : "0"}>
      <head>
        <style>{`:root{${light}}html.dark{${dark}}`}</style>
      </head>
      <body className={fontClassName}>
        <PrefsProvider initialLocale={ui.locale} initialTheme={ui.theme} initialLarge={ui.large} initialOverrides={initialOverrides}>
          <SiteChrome
            frames={frames.frames}
            utterances={utterances.utterances}
            consentMs={privacy.audio_consent_ack_ms}
            lastSyncMs={lastSync}
          >
            {children}
          </SiteChrome>
        </PrefsProvider>
      </body>
    </html>
  );
}
