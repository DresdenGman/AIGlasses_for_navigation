import { Pause, Play, Glasses, Watch, Smartphone, Monitor, CloudUpload, MapPin } from "lucide-react";
import { data, t } from "../data";
import { useApp } from "../components/store";
import { SectionTitle } from "../components/shared";

export default function Today() {
  const { locale, paused, setPaused, go } = useApp();
  const zh = locale === "zh";
  const places = [...new Set(data.segments.map((s) => t(locale, s.place)))];
  const devices = [
    { icon: Glasses, name: zh ? "AI 眼镜" : "AI Glasses", status: paused ? (zh ? "已暂停" : "Paused") : (zh ? "抓帧中 · 每 5 分钟一帧" : "Capturing · 1 frame / 5 min"), live: !paused },
    { icon: Watch, name: "Apple Watch", status: paused ? (zh ? "已暂停" : "Paused") : (zh ? "录音中 · 环境音频" : "Recording · ambient audio"), live: !paused },
    { icon: Smartphone, name: zh ? "手机" : "Phone", status: zh ? "已同步 · 刚刚" : "Synced · just now", live: true },
    { icon: Monitor, name: zh ? "电脑" : "Computer", status: zh ? "已同步 · 02:30 备份完成" : "Synced · backup done 02:30", live: true },
  ];
  return (
    <div className="page">
      <SectionTitle index="01" title={zh ? "今日" : "Today"}
        sub={zh ? "2026 年 4 月 18 日 · 示例日" : "Saturday, 18 April 2026 · sample day"} />
      <section className={"plate rec-card" + (paused ? " paused" : "")} aria-label="recording status">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={"rec-dot" + (paused ? " paused" : "")} />
          <strong style={{ fontSize: "1.15rem" }}>
            {paused ? (zh ? "录制已暂停" : "Recording paused") : (zh ? "正在录制" : "Recording")}
          </strong>
          <span className="badge badge-ok" style={{ marginLeft: "auto" }}>
            <CloudUpload size={12} /> {zh ? "自动同步开启" : "Auto-sync on"}
          </span>
        </div>
        <p className="dim" style={{ marginTop: 8, fontSize: "0.92rem" }}>
          {paused
            ? (zh ? "眼镜与手表都已停止采集。已记录的内容不受影响。" : "Glasses and watch have stopped capturing. Existing records are untouched.")
            : (zh ? "眼镜定时抓帧，Apple Watch 同步录音；新片段会自动同步到手机与电脑。" : "The glasses capture a frame every few minutes and the watch records audio; new segments sync to phone and computer automatically.")}
        </p>
        <div style={{ marginTop: 14 }}>
          <button className={"pause-btn" + (paused ? " resume" : "")} onClick={() => setPaused(!paused)}>
            {paused ? <Play size={20} /> : <Pause size={20} />}
            {paused ? (zh ? "恢复录制" : "Resume recording") : (zh ? "一键暂停录制" : "Pause recording")}
          </button>
        </div>
      </section>

      <section>
        <div className="grid3">
          <div className="plate"><div className="stat-num">{data.framesTotal}</div><div className="stat-label">{zh ? "今日帧数" : "Frames today"}</div></div>
          <div className="plate"><div className="stat-num">{data.segments.length}</div><div className="stat-label">{zh ? "片段" : "Segments"}</div></div>
          <div className="plate"><div className="stat-num">{places.length}</div><div className="stat-label">{zh ? "去过的地方" : "Places"}</div></div>
        </div>
        <p className="dim" style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", fontSize: "0.9rem" }}>
          <MapPin size={14} /> {places.join(" · ")}
        </p>
      </section>

      <section className="plate">
        <h3 className="serif" style={{ fontSize: "1.25rem", marginBottom: 4 }}>{zh ? "设备" : "Devices"}</h3>
        {devices.map((d) => (
          <div className="device-row" key={d.name}>
            <span className="device-ic"><d.icon size={19} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{d.name}</div>
              <div className="dim" style={{ fontSize: "0.88rem" }}>{d.status}</div>
            </div>
            <span className={"badge " + (d.live ? "badge-ok" : "badge-notfound")}>{d.live ? (zh ? "在线" : "online") : (zh ? "暂停" : "paused")}</span>
          </div>
        ))}
        <button className="text-btn" style={{ marginTop: 12 }} onClick={() => go("timeline")}>
          {zh ? "回看今天的时间线 →" : "Replay today's timeline →"}
        </button>
      </section>
    </div>
  );
}
