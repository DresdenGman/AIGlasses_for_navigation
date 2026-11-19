"use client";

import { cloneElement, useState } from "react";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import type { ArchiveDay, Locale } from "@/lib/api/schemas";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { FEATURED_DAY, formatKawara, formatNumber } from "@/lib/time";

const light = ["#F4F1EA", "#E2DFD9", "#ABA9A5", "#82817D", "#4A4947"];
const dark = ["#121211", "#3F3E3A", "#6A6862", "#A39E94", "#EDEAE2"];

export function ContactSheet({ days, locale }: { days: ArchiveDay[]; locale: Locale }) {
  const copy = t(locale);
  const theme = usePrefs().theme;
  const [list, setList] = useState(false);
  const byDate = new Map(days.map((day) => [day.day, day]));
  const data: Activity[] = days.map((day) => ({
    date: day.day,
    count: day.frames,
    level: day.cell_state === "recorded" ? day.level : 0,
  }));

  return (
    <section aria-labelledby="contact-sheet">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="contact-sheet" className="sr-only">
          {copy.heatmapLabel}
        </h2>
        <p className="max-w-measure text-sm">{copy.heatmapLabel}</p>
        <button type="button" className="min-h-11 border border-rule px-3 text-sm" aria-pressed={list} onClick={() => setList((value) => !value)}>
          {list ? copy.gridView : copy.listView}
        </button>
      </div>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <li className="inline-flex items-center gap-2"><i className="hatch inline-block h-3 w-3 border border-rule" aria-hidden="true" />{copy.legendPaused}</li>
        <li className="inline-flex items-center gap-2"><i className="slash-cell" aria-hidden="true" />{copy.legendDeleted}</li>
        <li className="inline-flex items-center gap-2"><i className="dash-cell" aria-hidden="true" />{copy.legendExpired}</li>
        <li className="inline-flex items-center gap-2"><i className="amber-tick" aria-hidden="true" />{copy.legendUncertain}</li>
      </ul>
      {list ? <DayTable days={days} locale={locale} /> : (
        <div className="overflow-x-auto">
          <svg width="0" height="0" aria-hidden="true">
            <defs>
              <pattern id="cell-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#B9B3A3" strokeWidth="1" />
              </pattern>
            </defs>
          </svg>
          <ActivityCalendar
            data={data}
            blockSize={14}
            blockMargin={3}
            blockRadius={0}
            fontSize={13}
            colorScheme={theme}
            theme={{ light, dark }}
            showColorLegend={false}
            showTotalCount={false}
            showMonthLabels
            showWeekdayLabels={["mon", "wed", "fri"]}
            renderBlock={(block, activity) => {
              const day = byDate.get(activity.date);
              if (!day) return block;
              const name = cellName(day, locale, copy);
              const fill = day.cell_state === "paused" ? "url(#cell-hatch)" : day.cell_state === "deleted" || day.cell_state === "expired" ? "transparent" : undefined;
              return (
                <a href={day.has_summary ? `/day/${day.day}/summary` : `/day/${day.day}`} aria-label={name}>
                  {cloneElement(block, {
                    fill: fill ?? block.props.fill,
                    stroke: day.day === FEATURED_DAY ? "var(--ink)" : day.cell_state === "expired" ? "var(--ink-muted)" : "var(--rule)",
                    strokeWidth: day.day === FEATURED_DAY ? 2 : 1,
                    strokeDasharray: day.cell_state === "expired" ? "2 2" : undefined,
                  })}
                  {day.cell_state === "deleted" ? <line x1={4} y1={12} x2={12} y2={2} stroke="var(--ink-muted)" strokeWidth={1} /> : null}
                  {day.uncertain_items > 0 ? <line x1={1} y1={13} x2={13} y2={13} stroke="var(--uncertain-rule)" strokeWidth={2} strokeDasharray="2 1" /> : null}
                  <title>{name}</title>
                </a>
              );
            }}
          />
        </div>
      )}
    </section>
  );
}

function cellName(day: ArchiveDay, locale: Locale, copy: ReturnType<typeof t>): string {
  const date = formatKawara(day.day, locale);
  const state = day.cell_state === "paused" ? copy.legendPaused : day.cell_state === "deleted" ? copy.legendDeleted : day.cell_state === "expired" ? copy.legendExpired : `${formatNumber(day.frames, locale)} ${copy.framesWord}`;
  const uncertain = day.uncertain_items > 0 ? `, ${day.uncertain_items} ${copy.uncertain}` : "";
  return `${date}, ${state}${uncertain}`;
}

function DayTable({ days, locale }: { days: ArchiveDay[]; locale: Locale }) {
  const copy = t(locale);
  const months = [...new Set(days.map((day) => day.day.slice(0, 7)))];
  return (
    <div className="max-h-[32rem] overflow-auto">
      {months.map((month) => (
        <table key={month} className="mb-6 w-full text-sm">
          <caption className="eyebrow pb-2 text-left">{month}</caption>
          <thead>
            <tr>
              <th scope="col" className="py-2 text-left font-normal">{copy.day}</th>
              <th scope="col" className="py-2 text-left font-normal">{copy.framesWord}</th>
              <th scope="col" className="py-2 text-left font-normal">{copy.setting}</th>
            </tr>
          </thead>
          <tbody>
            {days.filter((day) => day.day.startsWith(month)).map((day) => (
              <tr key={day.day} className="border-t border-rule">
                <th scope="row" className="py-2 text-left font-normal">
                  <a href={day.has_summary ? `/day/${day.day}/summary` : `/day/${day.day}`} className="underline">
                    {formatKawara(day.day, locale)}
                  </a>
                </th>
                <td className="mono py-2">{day.frames}</td>
                <td className="py-2">{day.cell_state}{day.uncertain_items > 0 ? ` · ${copy.uncertain}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
