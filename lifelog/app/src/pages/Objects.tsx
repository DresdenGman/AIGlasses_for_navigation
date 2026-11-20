import { useState } from "react";
import { X } from "lucide-react";
import { data, t } from "../data";
import type { TrackedObject } from "../data";
import { useApp } from "../components/store";
import { SectionTitle, UncertainBadge } from "../components/shared";

function Detail({ obj, onClose }: { obj: TrackedObject; onClose: () => void }) {
  const { locale } = useApp();
  const zh = locale === "zh";
  const last = obj.last;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="obj-imgwrap" style={{ position: "relative" }}>
          <img className="modal-photo" src={obj.photo} alt={t(locale, obj.name)} />
          {last?.bbox && (
            <span className="bbox" style={{
              left: `${last.bbox.x * 100}%`, top: `${last.bbox.y * 100}%`,
              width: `${last.bbox.w * 100}%`, height: `${last.bbox.h * 100}%`,
            }} />
          )}
        </div>
        <div className="modal-body">
          <h3 className="serif">{t(locale, obj.name)}</h3>
          <p className="dim">{t(locale, obj.note)}</p>
          {last && (
            <p>
              {zh ? "最后确切出现：" : "Last confirmed sighting: "}
              <strong>{last.day} {last.time}</strong> · {last.place}
              <span className="mono dim"> · {last.frame} · {Math.round(last.score * 100)}%</span>
            </p>
          )}
          {obj.newerUncertain && (
            <p>
              {zh ? "之后还有一次疑似出现（未确认）：" : "A later, unconfirmed glimpse: "}
              {obj.newerUncertain.day} {obj.newerUncertain.time} · {obj.newerUncertain.place}{" "}
              <UncertainBadge />
            </p>
          )}
          <div>
            <p className="stat-label" style={{ marginBottom: 6 }}>{zh ? "出现记录" : "Sightings"}</p>
            {obj.sightings.filter(Boolean).map((s, i) => (
              <p key={i} className="mono dim" style={{ marginBottom: 3 }}>
                {s!.day} {s!.time} · {s!.place} · {Math.round(s!.score * 100)}%
                {s!.certainty === "uncertain" ? (zh ? " · 不确定" : " · uncertain") : ""}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Objects() {
  const { locale } = useApp();
  const zh = locale === "zh";
  const [open, setOpen] = useState<TrackedObject | null>(null);
  return (
    <div className="page">
      <SectionTitle index="05" title={zh ? "物品定位" : "Object finder"}
        sub={zh ? "常用物品最后出现的时间、地点与那一帧画面" : "Where each tracked item was last seen — time, place, and the frame itself"} />
      <div className="obj-grid">
        {data.objects.map((o) => (
          <button className="obj-card" key={o.key} onClick={() => setOpen(o)}>
            <span className="obj-imgwrap">
              <img src={o.photo} alt={t(locale, o.name)} loading="lazy" />
              {o.last?.bbox && (
                <span className="bbox" style={{
                  left: `${o.last.bbox.x * 100}%`, top: `${o.last.bbox.y * 100}%`,
                  width: `${o.last.bbox.w * 100}%`, height: `${o.last.bbox.h * 100}%`,
                }} />
              )}
            </span>
            <span className="obj-body">
              <h4>{t(locale, o.name)}</h4>
              {o.last ? (
                <span className="mono dim" style={{ display: "block", marginTop: 3 }}>
                  {o.last.day.slice(5)} {o.last.time} · {o.last.place}
                </span>
              ) : <span className="mono dim">{zh ? "暂无记录" : "no sightings"}</span>}
              {o.newerUncertain && <span style={{ display: "block", marginTop: 6 }}><UncertainBadge /></span>}
            </span>
          </button>
        ))}
      </div>
      <p className="dim" style={{ fontSize: "0.9rem" }}>
        {zh ? "框选区域是该物品在最后确切出现的那一帧中的位置。置信度低于阈值的出现只标“不确定”，不作为确切位置。"
            : "The outline marks the item in its last confirmed frame. Sightings below the confidence threshold are labelled uncertain and never presented as fact."}
      </p>
      {open && <Detail obj={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
