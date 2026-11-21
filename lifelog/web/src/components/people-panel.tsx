"use client";

import { useState } from "react";
import type { Locale, SpeakerDay } from "@/lib/api/schemas";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { formatClock } from "@/lib/time";
import { speakerName } from "@/lib/text";

export function PeoplePanel({ locale, speakers }: { locale: Locale; speakers: SpeakerDay[] }) {
  const copy = t(locale);
  return (
    <div>
      <p className="max-w-measure">{copy.peopleHelp}</p>
      <ul className="mt-8 divide-y divide-rule border-y border-rule">
        {speakers.map((speaker) => (
          <PersonRow key={speaker.id} speaker={speaker} locale={locale} />
        ))}
      </ul>
    </div>
  );
}

function PersonRow({ speaker, locale }: { speaker: SpeakerDay; locale: Locale }) {
  const copy = t(locale);
  const prefs = usePrefs();
  const stored = prefs.overrides.speakerNames[speaker.id] ?? speaker.display_name ?? "";
  const [name, setName] = useState(stored);
  const shown = speakerName(speaker, locale, prefs.overrides.speakerNames[speaker.id]);
  return (
    <li className="grid grid-cols-1 gap-3 py-5 md:grid-cols-12">
      <div className="md:col-span-5">
        <p className="serif text-2xl">{shown}</p>
        <p className="mono text-sm text-ink-muted">{speaker.label}</p>
        <p className="mono mt-1 text-sm">
          {formatClock(speaker.first_ms, locale)} – {formatClock(speaker.last_ms, locale)}
        </p>
      </div>
      <div className="md:col-span-7">
        {speaker.is_self ? (
          <p>{copy.shownAsYou}</p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              prefs.setSpeakerName(speaker.id, name.trim());
            }}
          >
            <label className="block grow">
              <span className="text-sm">{copy.nameLabel}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full border border-rule bg-transparent px-3 py-2" />
            </label>
            <button type="submit" className="btn-outline min-h-11 border border-ink px-3">
              {copy.saveName}
            </button>
            <button
              type="button"
              className="min-h-11 border border-rule px-3"
              onClick={() => {
                setName("");
                prefs.setSpeakerName(speaker.id, "");
              }}
            >
              {copy.clearName}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
