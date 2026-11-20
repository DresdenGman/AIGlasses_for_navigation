import { useState } from "react";
import {
  Sun, Rows3, Sparkles, MessageCircleQuestion, PackageSearch,
  Glasses, HardDriveDownload, ShieldCheck, Settings as SettingsIcon, LayoutGrid,
} from "lucide-react";
import { AppProvider, useApp, type PageKey } from "./components/store";
import { L, navLabel } from "./data";
import Today from "./pages/Today";
import Timeline from "./pages/Timeline";
import Summary from "./pages/Summary";
import Ask from "./pages/Ask";
import Objects from "./pages/Objects";
import Guide from "./pages/Guide";
import Backup from "./pages/Backup";
import Privacy from "./pages/Privacy";
import Settings from "./pages/Settings";

const NAV: { key: PageKey; icon: typeof Sun }[] = [
  { key: "today", icon: Sun },
  { key: "timeline", icon: Rows3 },
  { key: "summary", icon: Sparkles },
  { key: "ask", icon: MessageCircleQuestion },
  { key: "objects", icon: PackageSearch },
  { key: "guide", icon: Glasses },
  { key: "backup", icon: HardDriveDownload },
  { key: "privacy", icon: ShieldCheck },
  { key: "settings", icon: SettingsIcon },
];
const MOBILE_PRIMARY: PageKey[] = ["today", "timeline", "ask", "objects"];
const PAGES: Record<PageKey, () => JSX.Element> = {
  today: Today, timeline: Timeline, summary: Summary, ask: Ask, objects: Objects,
  guide: Guide, backup: Backup, privacy: Privacy, settings: Settings,
};

function Shell() {
  const { page, go, locale } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const Page = PAGES[page];
  const inMore = !MOBILE_PRIMARY.includes(page);
  const navBtn = (key: PageKey, Icon: typeof Sun) => (
    <button key={key} aria-current={page === key ? "page" : undefined}
      onClick={() => { go(key); setMoreOpen(false); }}>
      <Icon size={19} /> <span>{navLabel(locale, key)}</span>
    </button>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="wordmark">{L.appName(locale)}</div>
          <div className="mono dim" style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>{L.tagline(locale)}</div>
        </div>
        {NAV.map((n) => navBtn(n.key, n.icon))}
        <div className="foot">
          <div>{locale === "zh" ? "研究原型 · 非医疗器械" : "Research prototype · not a medical device"}</div>
          <div>{locale === "zh" ? "前端演示版 v0.1.0" : "Front-end demo v0.1.0"}</div>
        </div>
      </aside>
      <div>
        <div className="topbar">
          <span className="wordmark">{L.appName(locale)}</span>
          <span className="tag">{L.tagline(locale)}</span>
          <span className="mono dim" style={{ marginLeft: "auto" }}>{navLabel(locale, page)}</span>
        </div>
        <main className="main">
          <p className="demo-banner" role="note">{L.demoBanner(locale)}</p>
          <Page />
        </main>
      </div>
      {moreOpen && (
        <div className="more-sheet">
          {NAV.filter((n) => !MOBILE_PRIMARY.includes(n.key)).map((n) => navBtn(n.key, n.icon))}
        </div>
      )}
      <nav className="tabbar" aria-label="primary">
        {NAV.filter((n) => MOBILE_PRIMARY.includes(n.key)).map((n) => navBtn(n.key, n.icon))}
        <button aria-current={inMore ? "page" : undefined} onClick={() => setMoreOpen(!moreOpen)}>
          <LayoutGrid size={19} /> <span>{L.more(locale)}</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
