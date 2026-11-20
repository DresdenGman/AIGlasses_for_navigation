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
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [suggestedQuery, setSuggestedQuery] = useState("");
  const hero = prepared.filter((item) => item.mode !== "year");
  const year = prepared.filter((item) => item.mode === "year");
  const normalizedQuery = suggestedQuery.toLocaleLowerCase();
  const filteredHero = hero.filter((item) =>
    item.question.toLocaleLowerCase().includes(normalizedQuery),
  );
  const filteredYear = year.filter((item) =>
    item.question.toLocaleLowerCase().includes(normalizedQuery),
  );

  const show = (item: AskResponse) => {
    setQuestion(item.question);
    setResponse(item);
  };

  const ask = (text: string) => {
    const next = answerQuestion({ question: text, locale, day: FEATURED_DAY }, prepared, docs);
    setQuestion(text);
    setResponse(next);
  };

  const label = useMemo(() => {
    if (!response) return "";
    return response.provider === "precomputed" ? copy.precomputed : copy.offline;
  }, [copy.offline, copy.precomputed, response]);

  const showAnswer = response !== null;

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
      {response?.provider === "extractive" ? <p className="mt-6 max-w-measure text-sm text-ink-muted">{copy.offlineNote}</p> : null}
      {showAnswer && response ? (
        <section aria-label={copy.answerRegion} aria-live="polite" className="mt-8 max-w-measure border border-rule p-5">
          <p className="eyebrow">{response.status === "answered" ? copy.answeredEyebrow : response.status === "uncertain" ? copy.uncertain : copy.notInRecords} · {label}</p>
          {response.status === "uncertain" ? (
            <div className="mt-4 border border-dashed border-uncertain-rule bg-paper p-4">
              <UncertainBadge locale={locale} />
              <p className="mt-3 text-sm text-uncertain-fg">{response.reason_text ?? `${copy.weakEvidence} ${response.score.toFixed(2)}`}</p>
              <p className="serif mt-3 text-2xl leading-snug">{response.answer}</p>
            </div>
          ) : response.status === "not_found" ? (
            <div className="mt-4">
              <MissingBadge locale={locale} />
              <p className="mt-3 text-ink-muted">{response.answer}</p>
            </div>
          ) : (
            <p className="serif mt-4 text-3xl leading-snug">{response.answer}</p>
          )}
          {response.citations.length > 0 ? (
            <p className="mt-4">
              {response.citations.map((citation, index) => (
                <EvidenceChip key={`${citation.handle ?? citation.evidence_id}-${index}`} citation={citation} n={index + 1} locale={locale} />
              ))}
            </p>
          ) : null}
          <details className="mt-5 text-sm">
            <summary>{copy.evidence}</summary>
            <p className="mt-2 text-ink-muted">
              {copy.provider}: {label}. {response.evidence_considered} {copy.considered}. {copy.score} {response.score.toFixed(2)}.
              {response.validation.reasons.length ? ` ${copy.reason}: ${response.validation.reasons.join(", ")}.` : ""}
            </p>
          </details>
        </section>
      ) : null}
      <section className="mt-10" aria-label={copy.suggested}>
        <h2 className="eyebrow">{copy.suggested}</h2>
        <label className="mt-4 block max-w-measure">
          <span className="sr-only">{copy.suggested}</span>
          <input
            type="search"
            value={suggestedQuery}
            onChange={(event) => setSuggestedQuery(event.target.value)}
            placeholder={copy.askPlaceholder}
            className="min-h-11 w-full border border-rule bg-transparent px-3"
          />
        </label>
        {[{ title: copy.suggestedDay, items: filteredHero }, { title: copy.suggestedYear, items: filteredYear }].map((group) => (
          <div key={group.title} className="mt-8">
            <h3 className="text-sm text-ink-muted">{group.title}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {group.items.map((item) => (
                <li key={item.id ?? item.question}>
                  <button
                    type="button"
                    className="min-h-11 text-left underline decoration-rule underline-offset-4"
                    aria-pressed={response !== null && response.id === item.id}
                    onClick={() => show(item)}
                  >
                    {item.question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
