import { useState } from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import { data } from "../data";
import { useApp } from "../components/store";
import { SectionTitle, Toggle, fmtBytes } from "../components/shared";

const RETENTION = [30, 90, 180, 365];

export default function Privacy() {
  const app = useApp();
  const { locale } = app;
  const zh = locale === "zh";
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purged, setPurged] = useState(false);
  return (
    <div className="page">
      <SectionTitle index="08" title={zh ? "隐私控制" : "Privacy"}
        sub={zh ? "录制随时可停，数据默认留在本地，外发全程有账可查" : "Stop capture any time. Data stays local by default; every byte sent out is logged."} />
      <section className="plate">
        <div className="row">
          <div className="row-main">
            <div className="row-title">{zh ? "暂停录制" : "Pause recording"}</div>
            <div className="row-sub">{zh ? "眼镜与手表立即停止采集，与“今日”页的大按钮同步。" : "Glasses and watch stop capturing immediately. Mirrors the big button on Today."}</div>
          </div>
          <Toggle on={app.paused} onChange={app.setPaused} label={zh ? "暂停录制" : "Pause recording"} />
        </div>
        <div className="row">
          <div className="row-main">
            <div className="row-title">{zh ? "本地优先" : "Local-first"}</div>
            <div className="row-sub">{zh ? "开启时，识别与总结优先在本机完成；只有明确需要时才调用云端模型，且每次外发都记入下方日志。" : "On-device processing first. Cloud models are called only when needed, and every send is written to the log below."}</div>
          </div>
          <Toggle on={app.localFirst} onChange={app.setLocalFirst} label={zh ? "本地优先" : "Local-first"} />
        </div>
        <div className="row">
          <div className="row-main">
            <div className="row-title">{zh ? "自动删除" : "Auto-delete"}</div>
            <div className="row-sub">{zh ? "超过保留天数的原始帧与音频自动清除（总结与索引保留）。" : "Raw frames and audio older than the retention window are deleted automatically (summaries and indexes stay)."}</div>
          </div>
          <select value={app.retentionDays} onChange={(e) => app.setRetentionDays(Number(e.target.value))}
            aria-label={zh ? "自动删除天数" : "Retention days"}>
            {RETENTION.map((d) => <option key={d} value={d}>{d} {zh ? "天" : "days"}</option>)}
          </select>
        </div>
      </section>

      <section>
        <h3 className="serif" style={{ fontSize: "1.3rem", marginBottom: 6 }}>
          <ShieldCheck size={18} style={{ verticalAlign: -2 }} /> {zh ? "外发日志（egress）" : "Egress log"}
        </h3>
        <p className="dim" style={{ fontSize: "0.9rem", marginBottom: 6 }}>
          {zh ? "每一次把数据发给云端模型，都有一条记录：时间、用途、字节数、内容构成。" : "Every send to a cloud model is recorded: time, purpose, bytes, and what was included."}
        </p>
        <div className="table-scroll">
          <table className="log-table">
            <thead><tr><th>{zh ? "时间" : "Time"}</th><th>{zh ? "用途" : "Purpose"}</th><th>{zh ? "内容" : "Items"}</th><th>{zh ? "字节" : "Bytes"}</th></tr></thead>
            <tbody>
              {data.egress.map((e, i) => (
                <tr key={i}>
                  <td className="mono">{e.ts}</td>
                  <td>{e.purpose}</td>
                  <td className="mono dim">{Object.entries(e.items).map(([k, v]) => `${k}×${v}`).join(" · ") || "—"}</td>
                  <td>{fmtBytes(e.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="plate" style={{ borderColor: "var(--danger)" }}>
        <h3 className="serif" style={{ fontSize: "1.25rem", color: "var(--danger)" }}>{zh ? "删除记录" : "Delete records"}</h3>
        <p className="dim" style={{ fontSize: "0.92rem", margin: "6px 0 12px" }}>
          {zh ? "永久删除某一天的全部帧、音频与转写。此操作不可恢复，删除本身会留一条审计记录。"
              : "Permanently delete a whole day of frames, audio and transcripts. This cannot be undone; the deletion itself leaves an audit entry."}
        </p>
        {!confirmPurge && !purged && (
          <button className="danger-btn" onClick={() => setConfirmPurge(true)}>
            <Trash2 size={15} style={{ verticalAlign: -2 }} /> {zh ? "删除示例日（2026-04-18）…" : "Delete the sample day (2026-04-18)…"}
          </button>
        )}
        {confirmPurge && !purged && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span>{zh ? "确定要永久删除这一天吗？" : "Really delete this day permanently?"}</span>
            <button className="danger-btn" onClick={() => setPurged(true)}>{zh ? "确认删除" : "Confirm delete"}</button>
            <button className="text-btn" onClick={() => setConfirmPurge(false)}>{zh ? "取消" : "Cancel"}</button>
          </div>
        )}
        {purged && <p style={{ color: "var(--danger)" }}>{zh ? "演示模式：未真正删除任何数据（示例数据保持不变）。" : "Demo mode: nothing was actually deleted — the showcase data is unchanged."}</p>}
        <div style={{ marginTop: 14 }}>
          <p className="stat-label" style={{ marginBottom: 6 }}>{zh ? "历史删除记录" : "Past deletions"}</p>
          {data.purges.map((p, i) => (
            <p key={i} className="mono dim" style={{ marginBottom: 3 }}>
              {p.ts} · {p.trigger} · {p.days.join(", ") || "—"} · {p.frames} {zh ? "帧" : "frames"} · {fmtBytes(p.bytes)}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
