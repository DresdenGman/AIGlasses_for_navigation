import { HardDrive, Cloud, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { data } from "../data";
import { useApp } from "../components/store";
import { SectionTitle, fmtBytes } from "../components/shared";

export default function Backup() {
  const { locale, backupTarget, setBackupTarget } = useApp();
  const zh = locale === "zh";
  const used = 0.62; // demo storage figure, labelled as showcase data below
  return (
    <div className="page">
      <SectionTitle index="07" title={zh ? "备份" : "Backup"}
        sub={zh ? "录像录音自动上传——云盘或自家 NAS，二选一" : "Recordings upload automatically — cloud drive or your own NAS, your choice"} />
      <div className="grid2">
        <button className="plate" style={{ textAlign: "left", borderColor: backupTarget === "nas" ? "var(--ink)" : undefined, borderWidth: backupTarget === "nas" ? 2 : 1 }}
          onClick={() => setBackupTarget("nas")} aria-pressed={backupTarget === "nas"}>
          <HardDrive size={22} />
          <h3 className="serif" style={{ fontSize: "1.3rem", margin: "8px 0 4px" }}>{zh ? "自家 NAS" : "Home NAS"}</h3>
          <p className="dim" style={{ fontSize: "0.92rem" }}>{zh ? "数据不出家门，局域网直连，夜间 02:30 自动增量备份。" : "Data never leaves home. Direct LAN sync, nightly incremental backup at 02:30."}</p>
          <p style={{ marginTop: 8 }}><span className="badge badge-ok">{backupTarget === "nas" ? (zh ? "当前目标" : "Active target") : (zh ? "可切换" : "Available")}</span></p>
        </button>
        <button className="plate" style={{ textAlign: "left", borderColor: backupTarget === "cloud" ? "var(--ink)" : undefined, borderWidth: backupTarget === "cloud" ? 2 : 1 }}
          onClick={() => setBackupTarget("cloud")} aria-pressed={backupTarget === "cloud"}>
          <Cloud size={22} />
          <h3 className="serif" style={{ fontSize: "1.3rem", margin: "8px 0 4px" }}>{zh ? "云盘" : "Cloud drive"}</h3>
          <p className="dim" style={{ fontSize: "0.92rem" }}>{zh ? "异地容灾，出门在外也能回看；上传前在本机加密。" : "Off-site safety net, reachable anywhere. Encrypted on-device before upload."}</p>
          <p style={{ marginTop: 8 }}><span className="badge badge-ok">{backupTarget === "cloud" ? (zh ? "当前目标" : "Active target") : (zh ? "可切换" : "Available")}</span></p>
        </button>
      </div>

      <section className="plate">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="serif" style={{ fontSize: "1.25rem" }}>{zh ? "存储用量" : "Storage"}</h3>
          <span className="mono dim"><Lock size={12} style={{ verticalAlign: -1 }} /> {zh ? "备份已加密" : "backups encrypted"}</span>
        </div>
        <div className="usage-bar" style={{ margin: "12px 0 6px" }}><div style={{ width: `${used * 100}%` }} /></div>
        <p className="mono dim">{zh ? "示例数据：已用 62% · 43,705 帧 · 436 小时音频" : "Showcase figures: 62% used · 43,705 frames · 436 h audio"}</p>
      </section>

      <section>
        <h3 className="serif" style={{ fontSize: "1.3rem", marginBottom: 6 }}>{zh ? "最近备份记录" : "Recent runs"}</h3>
        <div className="table-scroll">
          <table className="log-table">
            <thead><tr><th>{zh ? "开始" : "Started"}</th><th>{zh ? "目标" : "Target"}</th><th>{zh ? "文件" : "Files"}</th><th>{zh ? "大小" : "Size"}</th><th>{zh ? "状态" : "State"}</th></tr></thead>
            <tbody>
              {data.backups.map((b, i) => (
                <tr key={i}>
                  <td className="mono">{b.started}</td>
                  <td>{b.target === "nas" ? "NAS" : (zh ? "云盘" : "Cloud")}</td>
                  <td>{b.files}</td><td>{fmtBytes(b.bytes)}</td>
                  <td>{b.state === "ok"
                    ? <span style={{ color: "var(--speech)", display: "inline-flex", gap: 5, alignItems: "center" }}><CheckCircle2 size={14} /> OK</span>
                    : <span style={{ color: "var(--danger)", display: "inline-flex", gap: 5, alignItems: "center" }}><AlertCircle size={14} /> {b.state}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
