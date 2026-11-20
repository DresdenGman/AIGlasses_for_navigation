import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "../data";

export type PageKey = "today" | "timeline" | "summary" | "ask" | "objects" | "guide" | "backup" | "privacy" | "settings";
export type ThemeMode = "light" | "dark" | "system";

interface AppState {
  page: PageKey; go: (p: PageKey) => void;
  locale: Locale; setLocale: (l: Locale) => void;
  theme: ThemeMode; setTheme: (t: ThemeMode) => void;
  paused: boolean; setPaused: (v: boolean) => void;
  localFirst: boolean; setLocalFirst: (v: boolean) => void;
  retentionDays: number; setRetentionDays: (n: number) => void;
  threshold: number; setThreshold: (n: number) => void;
  backupTarget: "nas" | "cloud"; setBackupTarget: (v: "nas" | "cloud") => void;
  focusSegment: number | null; openSegment: (i: number) => void; clearFocus: () => void;
}

const Ctx = createContext<AppState | null>(null);
const store = (k: string, d: string) => localStorage.getItem("lifelog." + k) ?? d;
const save = (k: string, v: string) => localStorage.setItem("lifelog." + k, v);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageKey>("today");
  const [locale, setLocaleS] = useState<Locale>(() => (store("locale", "en") as Locale));
  const [theme, setThemeS] = useState<ThemeMode>(() => store("theme", "system") as ThemeMode);
  const [paused, setPausedS] = useState(() => store("paused", "0") === "1");
  const [localFirst, setLocalFirstS] = useState(() => store("localFirst", "1") === "1");
  const [retentionDays, setRetentionDaysS] = useState(() => Number(store("retention", "365")));
  const [threshold, setThresholdS] = useState(() => Number(store("threshold", "0.7")));
  const [backupTarget, setBackupTargetS] = useState<"nas" | "cloud">(() => store("backupTarget", "nas") as "nas" | "cloud");
  const [focusSegment, setFocusSegment] = useState<number | null>(null);

  useEffect(() => {
    const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [theme, locale]);

  const value = useMemo<AppState>(() => ({
    page, go: (p) => { setPage(p); window.scrollTo({ top: 0 }); },
    locale, setLocale: (l) => { setLocaleS(l); save("locale", l); },
    theme, setTheme: (v) => { setThemeS(v); save("theme", v); },
    paused, setPaused: (v) => { setPausedS(v); save("paused", v ? "1" : "0"); },
    localFirst, setLocalFirst: (v) => { setLocalFirstS(v); save("localFirst", v ? "1" : "0"); },
    retentionDays, setRetentionDays: (n) => { setRetentionDaysS(n); save("retention", String(n)); },
    threshold, setThreshold: (n) => { setThresholdS(n); save("threshold", String(n)); },
    backupTarget, setBackupTarget: (v) => { setBackupTargetS(v); save("backupTarget", v); },
    focusSegment,
    openSegment: (i) => { setFocusSegment(i); setPage("timeline"); },
    clearFocus: () => setFocusSegment(null),
  }), [page, locale, theme, paused, localFirst, retentionDays, threshold, backupTarget, focusSegment]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
