"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/api/schemas";

const STORAGE_KEY = "ll_showcase_state";

export type ShowcaseOverrides = {
  paused: boolean;
  retentionDays: number;
  localFirst: boolean;
  audioEnabled: boolean;
  faceBlur: boolean;
  locationEnabled: boolean;
  keepRawAudio: boolean;
  cloudVision: boolean;
  backupEnabled: boolean;
  backupTarget: "nas" | "cloud";
  speakerNames: Record<string, string>;
  pausedAt: number | null;
};

type DialogName = "resume" | "cloud" | "audio" | null;

type PrefsValue = {
  locale: Locale;
  theme: "light" | "dark";
  large: boolean;
  overrides: ShowcaseOverrides;
  dialog: DialogName;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleLarge: () => void;
  pause: () => void;
  askResume: () => void;
  confirmResume: () => void;
  closeDialog: () => void;
  requestCloudOff: () => void;
  confirmCloudOff: () => void;
  requestAudio: () => void;
  confirmAudio: () => void;
  update: (patch: Partial<ShowcaseOverrides>) => void;
  setSpeakerName: (id: string, name: string) => void;
};

const PrefsContext = createContext<PrefsValue | null>(null);

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function PrefsProvider({
  initialLocale,
  initialTheme,
  initialLarge,
  initialOverrides,
  children,
}: {
  initialLocale: Locale;
  initialTheme: "light" | "dark";
  initialLarge: boolean;
  initialOverrides: ShowcaseOverrides;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);
  const [theme, setThemeState] = useState(initialTheme);
  const [large, setLarge] = useState(initialLarge);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<ShowcaseOverrides>;
        setOverrides((current) => ({
          ...current,
          ...saved,
          speakerNames: { ...current.speakerNames, ...(saved.speakerNames ?? {}) },
        }));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides, ready]);

  const value = useMemo<PrefsValue>(() => {
    const update = (patch: Partial<ShowcaseOverrides>) => {
      setOverrides((current) => ({ ...current, ...patch }));
    };
    return {
      locale,
      theme,
      large,
      overrides,
      dialog,
      setLocale: (next) => {
        writeCookie("ll_locale", next);
        document.documentElement.lang = next;
        setLocaleState(next);
        router.refresh();
      },
      setTheme: (next) => {
        writeCookie("ll_theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
        setThemeState(next);
      },
      toggleLarge: () => {
        setLarge((current) => {
          const next = !current;
          writeCookie("ll_large", next ? "1" : "0");
          document.documentElement.dataset.large = next ? "1" : "0";
          return next;
        });
      },
      pause: () => update({ paused: true, pausedAt: Date.now() }),
      askResume: () => setDialog("resume"),
      confirmResume: () => {
        update({ paused: false, pausedAt: null });
        setDialog(null);
      },
      closeDialog: () => setDialog(null),
      requestCloudOff: () => setDialog("cloud"),
      confirmCloudOff: () => {
        update({ localFirst: false });
        setDialog(null);
      },
      requestAudio: () => setDialog("audio"),
      confirmAudio: () => {
        update({ audioEnabled: true });
        setDialog(null);
      },
      update,
      setSpeakerName: (id, name) => {
        setOverrides((current) => ({
          ...current,
          speakerNames: { ...current.speakerNames, [id]: name },
        }));
      },
    };
  }, [dialog, large, locale, overrides, router, theme]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs must be used inside PrefsProvider");
  return value;
}
