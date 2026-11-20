import { useMemo, useState } from "react";
import { Search, Clock3 } from "lucide-react";
import { data } from "../data";
import type { Answer } from "../data";
import { useApp } from "../components/store";
import { SectionTitle, SegmentModal, UncertainBadge, NotFoundBadge } from "../components/shared";

function matchScore(q: string, a: Answer): number {
  const query = q.toLowerCase().trim();
  if (!query) return 0;
  const target = (a.q + " " + a.a).toLowerCase();
  if (a.q.toLowerCase() === query) return 100;
  let score = 0;
  for (const w of query.split(/[\s,，、?？]+/).filter((w) => w.length > 1)) {
    if (target.includes(w)) score += w.length;
  }
  // CJK fallback: shared character bigrams
  if (score === 0) {
    for (let i = 0; i + 1 < query.length; i++) if (target.includes(query.slice(i, i + 2))) score += 2;
  }
  return score;
}

export default function Ask() {
  const { locale, openSegment } = useApp();
  const zh = locale === "zh";
  const answers = data.answers[locale];
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Answer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState<number | null>(null);

  const presets = useMemo(() => answers.slice(0, 10), [answers]);

  const submit = (q: string) => {
    const scored = answers.map((a) => ({ a, s: matchScore(q, a) })).sort((x, y) => y.s - x.s);
    if (scored.length && scored[0].s >= 4) { setPicked(scored[0].a); setNotFound(false); }
    else { setPicked(null); setNotFound(true); }
  };

  const showAnswer = (a: Answer) => {
    setPicked(a); setNotFound(false);
    document.getElementById("ask-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page">
      <SectionTitle index="04" title={zh ? "问答检索" : "Ask your day"}
        sub={zh ? "答案附证据时间戳，点开直达片段；查不到就明说" : "Answers carry evidence timestamps — tap to jump to the segment. No match means it says so."} />
      <form className="ask-input" onSubmit={(e) => { e.preventDefault(); submit(query); }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={zh ? "例如：我把螺丝刀放哪了？" : "e.g. Where did I put the screwdriver?"}
          aria-label={zh ? "提问" : "Ask a question"} />
        <button type="submit"><Search size={17} style={{ verticalAlign: -3 }} /> {zh ? "问" : "Ask"}</button>
      </form>
      <div className="q-list">
        {presets.map((a) => (
          <button key={a.id} className="q-chip" onClick={() => { setQuery(a.q); showAnswer(a); }}>{a.q}</button>
        ))}
      </div>

      <div id="ask-result">
        {notFound && (
          <div className="answer-card">
            <NotFoundBadge />
            <p style={{ marginTop: 10 }}>
              {zh ? "记录里没有能回答这个问题的证据。可能是那段时间暂停了录制，或者这件事没有被拍到/录到。我不会替你编一个答案。"
                  : "There is no evidence in the records that answers this. Recording may have been paused, or it was never captured. I won't invent an answer."}
            </p>
          </div>
        )}
        {picked && (
          <article className={"answer-card" + (picked.uncertain ? " uncertain" : "")}>
            <p className="mono dim" style={{ marginBottom: 6 }}>{picked.q}</p>
            <p className="serif" style={{ fontSize: "1.28rem", lineHeight: 1.4 }}>{picked.a}</p>
            {picked.uncertain && <p style={{ marginTop: 10 }}><UncertainBadge /></p>}
            {picked.status === "not_found" && <p style={{ marginTop: 10 }}><NotFoundBadge /></p>}
            <div className="evidence-row">
              {picked.evidence.map((e, i) => (
                <button key={i} className={"ev-chip" + (e.certainty === "uncertain" ? " unc" : "")}
                  onClick={() => { if (e.seg !== null) { openSegment(e.seg); } }}
                  title={zh ? "打开对应片段" : "Open the segment"}>
                  <Clock3 size={12} /> {e.time} · {e.label}
                </button>
              ))}
            </div>
            <p className="mono dim" style={{ marginTop: 10 }}>
              {zh ? "演示模式：按关键词匹配预设答案（中英各 46 题）" : "Demo mode: keyword match over the preset answer set (46 per language)"}
            </p>
          </article>
        )}
      </div>

      <section>
        <h3 className="serif" style={{ fontSize: "1.3rem", marginBottom: 10 }}>{zh ? "全部预设问题" : "All preset questions"}</h3>
        <div className="q-list">
          {answers.map((a) => (
            <button key={a.id} className="q-chip" onClick={() => showAnswer(a)}>{a.q}</button>
          ))}
        </div>
      </section>
      {modal !== null && <SegmentModal index={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
