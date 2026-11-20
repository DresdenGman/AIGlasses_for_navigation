import { useEffect, useState } from "react";
import { Volume2, Play, Square } from "lucide-react";
import { data } from "../data";
import { useApp } from "../components/store";
import { SectionTitle, UncertainBadge } from "../components/shared";

/**
 * Guide — the glasses themselves: live scene narration.
 * Demo mode steps through the sample day's frame captions; anything below
 * the confidence threshold is announced as "uncertain", never guessed.
 */
export default function Guide() {
  const { locale, threshold } = useApp();
  const zh = locale === "zh";
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const feed = data.guideFeed;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setIdx((i) => Math.min(i + 1, feed.length - 1)), 2600);
    return () => clearInterval(id);
  }, [playing, feed.length]);
  useEffect(() => { if (idx >= feed.length - 1) setPlaying(false); }, [idx, feed.length]);

  const shown = feed.slice(0, idx + 1).reverse();
  return (
    <div className="page">
      <SectionTitle index="06" title={zh ? "眼镜导引" : "Glasses guide"}
        sub={zh ? "实时场景播报演示 · 低置信度时只说“不确定”" : "Live scene narration, simulated · below the threshold it says “uncertain”, never a guess"} />
      <section className="plate">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Volume2 size={20} />
          <strong>{zh ? "语音播报" : "Voice narration"}</strong>
          <span className="mono dim">{zh ? `置信阈值 ${threshold.toFixed(2)}（可在设置中调整）` : `confidence threshold ${threshold.toFixed(2)} (adjustable in Settings)`}</span>
          <button className="pause-btn" style={{ width: "auto", padding: "10px 18px", marginLeft: "auto", fontSize: "0.98rem" }}
            onClick={() => { if (idx >= feed.length - 1) setIdx(0); setPlaying(!playing); }}>
            {playing ? <Square size={16} /> : <Play size={16} />} {playing ? (zh ? "停止" : "Stop") : (zh ? "播放示例日播报" : "Play the sample day")}
          </button>
        </div>
      </section>
      <div className="guide-feed" aria-live="polite">
        {shown.map((g, i) => {
          const low = g.score !== null && g.score < threshold;
          return (
            <div className="guide-item" key={feed.length - i}>
              <span className="mono dim">{g.time}</span>
              <div>
                <p className="voice" style={{ color: low ? "var(--uncertain-fg)" : "var(--speech)" }}>
                  {low
                    ? (zh ? `不确定：${g.text}` : `Uncertain: ${g.text}`)
                    : g.text}
                </p>
                <p className="mono dim" style={{ marginTop: 3 }}>
                  {g.score !== null ? `${Math.round(g.score * 100)}%` : ""} {low && <UncertainBadge />}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="dim" style={{ fontSize: "0.9rem" }}>
        {zh ? "这正是导航眼镜的主线：看见什么就播报什么；看不清，就明确说不确定，绝不编造方向或障碍物信息。"
            : "This is the navigation-glasses principle: announce what is seen; when the view is unclear, say so plainly — never invent directions or obstacles."}
      </p>
    </div>
  );
}
