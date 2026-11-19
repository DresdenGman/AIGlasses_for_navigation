"use client";

import { useMemo, useState } from "react";
import type { AskResponse, Locale } from "@/lib/api/schemas";
import { EvidenceChip } from "@/components/evidence";
import { MissingBadge, UncertainBadge } from "@/components/media";
import { t } from "@/lib/i18n";
import { answerQuestion, type SearchDoc } from "@/lib/search";
import { FEATURED_DAY } from "@/lib/time";

export function AskPanel({
  locale,
  prepared,
  docs,
}: {
  locale: Locale;
  prepared: AskResponse[];
  docs: SearchDoc[];
}) {
  const copy = t(locale);
  const [question, setQuestion] = useState(prepared[0]?.question ?? "");
  const [response, setResponse] = useState<AskResponse | null>(prepared[0] ?? null);

  const ask = (text: string) => {
    const next = answerQuestion({ question: text, locale, day: FEATURED_DAY }, prepared, docs);
    setQuestion(text);
    setResponse(next);
  };

  const label = useMemo(() => {
    if (!response) return "";
    return response.provider === "precomputed" ? copy.precomputed : copy.offline;
  }, [copy.offline, copy.precomputed, response]);

  const showAnswer = response && (response.status === "not_found" || response.citations.length > 0);

  return (
    <div>
      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) ask(question.trim());
        }}
      >
        <label htmlFor="ask-q" className="sr-only">
          {copy.askPlaceholder}
        </label>
        <div className="flex items-end gap-3 border border-rule px-4 py-3">
          <input
            id="ask-q"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={copy.askPlaceholder}
            className="serif w-full bg-transparent text-3xl leading-tight outline-none"
          />
          <button type="submit" className="min-h-11 min-w-11 border border-ink px-3" aria-label={copy.askSubmit}>
            {copy.askSubmit}
          </button>
        </div>
      </form>
      <section className="mt-8" aria-label={copy.suggested}>
        <h2 className="text-sm">{copy.suggested}</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {prepared.map((item) => (
            <li key={item.question}>
              <button type="button" className="text-left underline decoration-rule underline-offset-4" onClick={() => ask(item.question)}>
                {item.question}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-6 max-w-measure text-sm text-ink-muted">{copy.offlineNote}</p>
      {showAnswer && response ? (
        <section aria-label={copy.answerRegion} aria-live="polite" className="mt-6 border border-rule p-5">
          <p className="eyebrow">{response.status === "answered" ? copy.answeredEyebrow : response.status === "uncertain" ? copy.uncertain : copy.notInRecords} · {label}</p>
          {response.status === "uncertain" ? (
            <div className="mt-4 border border-dashed border-uncertain-rule bg-uncertain-bg p-4 text-uncertain-fg">
              <UncertainBadge locale={locale} />
              <p className="serif mt-3 text-2xl leading-snug">{response.answer}</p>
            </div>
          ) : response.status === "not_found" ? (
            <div className="mt-4">
              <MissingBadge locale={locale} />
              <p className="mt-3 max-w-measure">{response.answer}</p>
            </div>
          ) : (
            <p className="serif mt-4 text-3xl leading-snug">{response.answer}</p>
          )}
          {response.citations.length > 0 ? (
            <p className="mt-4">
              {response.citations.map((citation, index) => (
                <EvidenceChip key={citation.evidence_id} citation={citation} n={index + 1} locale={locale} />
              ))}
            </p>
          ) : null}
          {response.status === "uncertain" ? <p className="mt-3 text-sm">{copy.weakEvidence} {response.score.toFixed(2)}</p> : null}
          <details className="mt-5 text-sm">
            <summary>{copy.evidence}</summary>
            <p className="mt-2 text-ink-muted">
              {copy.provider}: {label}. {response.evidence_considered} {copy.considered}. {copy.score} {response.score.toFixed(2)}.
              {response.validation.reasons.length ? ` ${copy.reason}: ${response.validation.reasons.join(", ")}.` : ""}
            </p>
          </details>
        </section>
      ) : null}
    </div>
  );
}
