import { data } from "../data";
import { useApp } from "../components/store";
import type { ThemeMode } from "../components/store";
import { SectionTitle } from "../components/shared";

export default function Settings() {
  const app = useApp();
  const { locale } = app;
  const zh = locale === "zh";
  const themes: { v: ThemeMode; label: string }[] = [
    { v: "light", label: zh ? "浅色" : "Light" },
    { v: "dark", label: zh ? "深色" : "Dark" },
    { v: "system", label: zh ? "跟随系统" : "System" },
  ];
  return (
    <div className="page">
      <SectionTitle index="09" title={zh ? "设置" : "Settings"} sub={zh ? "语言、主题与识别行为" : "Language, theme, and recognition behaviour"} />
      <section className="plate">
        <div className="row">
          <div className="row-main"><div className="row-title">{zh ? "语言" : "Language"}</div>
            <div className="row-sub">{zh ? "界面与播报语言" : "Interface and narration language"}</div></div>
          <div className="seg-btns" role="group" aria-label="language">
            <button aria-pressed={locale === "zh"} onClick={() => app.setLocale("zh")}>中文</button>
            <button aria-pressed={locale === "en"} onClick={() => app.setLocale("en")}>EN</button>
          </div>
        </div>
        <div className="row">
          <div className="row-main"><div className="row-title">{zh ? "主题" : "Theme"}</div>
            <div className="row-sub">{zh ? "档案纸浅色 / 墨色深色" : "Archive paper light / ink dark"}</div></div>
          <div className="seg-btns" role="group" aria-label="theme">
            {themes.map((th) => (
              <button key={th.v} aria-pressed={app.theme === th.v} onClick={() => app.setTheme(th.v)}>{th.label}</button>
            ))}
          </div>
        </div>
        <div className="row" style={{ display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="row-title">{zh ? "置信阈值" : "Confidence threshold"}</div>
            <span className="mono">{app.threshold.toFixed(2)}</span>
          </div>
          <div className="row-sub" style={{ marginBottom: 8 }}>
            {zh ? "低于此置信度的识别结果只播报“不确定”，不作为事实呈现。默认 0.70，与眼镜固件一致。"
                : "Results below this score are announced as “uncertain” and never presented as fact. Default 0.70, matching the glasses firmware."}
          </div>
          <input type="range" min={0.5} max={0.95} step={0.01} value={app.threshold}
            onChange={(e) => app.setThreshold(Number(e.target.value))}
            aria-label={zh ? "置信阈值" : "Confidence threshold"} />
        </div>
      </section>

      <section className="plate">
        <h3 className="serif" style={{ fontSize: "1.3rem", marginBottom: 8 }}>{zh ? "关于" : "About"}</h3>
        <p style={{ marginBottom: 8 }}>
          {zh ? "Lifelog 是 AI 导航眼镜的配套应用：把眼镜抓帧与手表录音整理成可回看、可检索、会承认不确定的生活档案。"
              : "Lifelog is the companion app for the AI navigation glasses: it turns frame captures and watch audio into an archive you can replay, search, and trust — because it admits what it doesn't know."}
        </p>
        <p style={{ marginBottom: 8 }}>
          <strong>{zh ? "原型声明" : "Prototype statement"}.</strong>{" "}
          {zh ? "本应用为研究原型（research prototype），不是医疗器械，未经临床验证或认证；不替代白杖、导盲犬、定向行走训练或个人判断。"
              : "This app is a research prototype. It is not a medical device, has not been clinically validated or certified, and does not replace a white cane, a guide dog, orientation-and-mobility training, or your own judgement."}
        </p>
        <p className="mono dim">
          {zh ? "版本 0.1.0 · 前端演示版 · 数据：虚构示例（示例日 2026-04-18）" : "Version 0.1.0 · front-end demo · data: fictional showcase set (sample day 2026-04-18)"}
          <br />{zh ? "开源仓库" : "Open source"}: github.com/DresdenGman/QuietFrame
        </p>
      </section>
    </div>
  );
}
