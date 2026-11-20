import { useEffect } from "react";
import { X, CircleDashed, ShieldQuestion } from "lucide-react";
import { data, t, L } from "../data";
import { useApp } from "./store";

export function UncertainBadge() {
  const { locale } = useApp();
  return (
    <span className="badge badge-uncertain">
      <CircleDashed size={12} strokeWidth={2} /> {L.uncertain(locale)}
    </span>
  );
}

export function NotFoundBadge() {
  const { locale } = useApp();
  return (
    <span className="badge badge-notfound">
      <ShieldQuestion size={12} strokeWidth={2} /> {L.notFound(locale)}
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={"toggle" + (on ? " on" : "")} onClick={() => onChange(!on)}>
      <span className="toggle-knob" />
    </button>
  );
}

export function SectionTitle({ index, title, sub }: { index: string; title: string; sub?: string }) {
  return (
    <header className="section-head">
      <span className="section-index">{index}</span>
      <div>
        <h2>{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
    </header>
  );
}

/** Segment detail overlay — opened from Timeline cards and Ask evidence chips. */
export function SegmentModal({ index, onClose }: { index: number; onClose: () => void }) {
  const { locale } = useApp();
  const seg = data.segments[index];
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  if (!seg) return null;
  const framesInSeg = Math.max(1, Math.round((seg.endMs - seg.startMs) / 300000));
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <img className="modal-photo" src={seg.photo} alt={t(locale, seg.title)} />
        <div className="modal-body">
          <p className="mono dim">{seg.start} – {seg.end} · {t(locale, seg.place)}</p>
          <h3 className="serif">{t(locale, seg.title)}</h3>
          <p>{t(locale, seg.summary)}</p>
          <p className="mono dim">
            {locale === "zh" ? `本片段约 ${framesInSeg} 帧 · 示例数据` : `≈ ${framesInSeg} frames in this segment · showcase data`}
          </p>
          {seg.certainty === "uncertain" && <UncertainBadge />}
        </div>
      </div>
    </div>
  );
}

export const fmtBytes = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(1) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(0) + " MB" : (n / 1e3).toFixed(0) + " KB";
