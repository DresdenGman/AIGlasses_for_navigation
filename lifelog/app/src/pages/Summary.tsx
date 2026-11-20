import { data } from "../data";
import { useApp } from "../components/store";
import { SectionTitle, UncertainBadge } from "../components/shared";
import type { SummaryItem } from "../data";

function Block({ title, items }: { title: string; items: SummaryItem[] }) {
  if (!items.length) return null;
  return (
    <section className="plate">
      <h3 className="serif" style={{ fontSize: "1.3rem", marginBottom: 8 }}>{title}</h3>
      {items.map((it, i) => (
        <p key={i} style={{ marginBottom: 8 }}>
          {it.text} {it.certainty === "uncertain" && <UncertainBadge />}
        </p>
      ))}
    </section>
  );
}

export default function Summary() {
  const { locale } = useApp();
  const zh = locale === "zh";
  const s = data.summary[locale];
  const y = data.year;
  return (
    <div className="page">
      <SectionTitle index="03" title={zh ? "AI 日总结" : "Daily summary"}
        sub={zh ? "由当天记录自动生成 · 拿不准的条目明确标注" : "Generated from the day's records · unsure items are labelled, never hidden"} />
      <p className="serif" style={{ fontSize: "1.55rem", lineHeight: 1.3 }}>{s.headline}</p>
      <Block title={zh ? "去了哪" : "Where you went"} items={s.places} />
      <Block title={zh ? "做了什么" : "What you did"} items={s.activities} />
      <Block title={zh ? "见了谁" : "Who you met"} items={s.people} />
      <Block title={zh ? "说了什么" : "What was said"} items={s.quotes} />
      {s.uncertain.length > 0 && (
        <section className="plate" style={{ borderStyle: "dashed", borderColor: "var(--uncertain-rule)" }}>
          <h3 className="serif" style={{ fontSize: "1.3rem", marginBottom: 8 }}>{zh ? "不确定的部分" : "Marked uncertain"}</h3>
          {s.uncertain.map((it, i) => <p key={i} style={{ marginBottom: 8 }}>{it.text} <UncertainBadge /></p>)}
        </section>
      )}
      <section>
        <h3 className="serif" style={{ fontSize: "1.3rem", marginBottom: 10 }}>{zh ? "年度总览" : "The year in numbers"}</h3>
        <div className="grid3">
          <div className="plate"><div className="stat-num">{y.days_captured}<span className="dim" style={{ fontSize: "1rem" }}> / {y.days_total}</span></div><div className="stat-label">{zh ? "已记录天数" : "Days captured"}</div></div>
          <div className="plate"><div className="stat-num">{y.frames.toLocaleString()}</div><div className="stat-label">{zh ? "总帧数" : "Frames"}</div></div>
          <div className="plate"><div className="stat-num">{y.questions_asked}</div><div className="stat-label">{zh ? "提问次数" : "Questions asked"}</div></div>
          <div className="plate"><div className="stat-num">{y.objects_found}</div><div className="stat-label">{zh ? "找回物品" : "Objects found"}</div></div>
          <div className="plate"><div className="stat-num">{y.uncertain_items}</div><div className="stat-label">{zh ? "标为不确定的条目" : "Items marked uncertain"}</div></div>
          <div className="plate"><div className="stat-num">{y.backups_ok_last_30}<span className="dim" style={{ fontSize: "1rem" }}> / 30</span></div><div className="stat-label">{zh ? "近 30 天备份成功" : "Backups OK · 30 days"}</div></div>
        </div>
      </section>
    </div>
  );
}
