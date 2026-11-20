import { useEffect, useMemo, useState } from "react";
import { data, t } from "../data";
import { useApp } from "../components/store";
import { SectionTitle, SegmentModal, UncertainBadge } from "../components/shared";

export default function Timeline() {
  const { locale, focusSegment, clearFocus } = useApp();
  const zh = locale === "zh";
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (focusSegment !== null) {
      setOpen(focusSegment);
      clearFocus();
      document.getElementById("seg-" + focusSegment)?.scrollIntoView({ block: "center" });
    }
  }, [focusSegment, clearFocus]);

  const hours = useMemo(() => {
    const m = new Map<string, number[]>();
    data.segments.forEach((s, i) => {
      const h = s.start.slice(0, 2) + ":00";
      m.set(h, [...(m.get(h) ?? []), i]);
    });
    return [...m.entries()];
  }, []);

  return (
    <div className="page">
      <SectionTitle index="02" title={zh ? "时间线回看" : "Timeline"}
        sub={zh ? "2026-04-18 · 胶片条与片段卡，点开看详情" : "2026-04-18 · filmstrip and segment cards — tap to open"} />
      <div className="filmstrip" role="list" aria-label="filmstrip">
        {data.segments.map((s, i) => (
          <figure key={s.id} className={open === i ? "active" : ""} onClick={() => setOpen(i)}>
            <img src={s.photo} alt={t(locale, s.title)} loading="lazy" />
            <figcaption><span>{s.start}</span><span>F-{String(i + 1).padStart(2, "0")}</span></figcaption>
          </figure>
        ))}
      </div>
      <div>
        {hours.map(([hour, idxs]) => (
          <div className="hour-group" key={hour}>
            <h3>{hour}</h3>
            {idxs.map((i) => {
              const s = data.segments[i];
              return (
                <button className="seg-card" key={s.id} id={"seg-" + i} onClick={() => setOpen(i)}>
                  <img src={s.photo} alt="" loading="lazy" />
                  <span>
                    <span className="mono dim">{s.start} – {s.end} · {t(locale, s.place)}</span>
                    <h4>{t(locale, s.title)}</h4>
                    <p>{t(locale, s.summary)}</p>
                    {s.certainty === "uncertain" && <span style={{ marginTop: 6, display: "inline-block" }}><UncertainBadge /></span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {open !== null && <SegmentModal index={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
