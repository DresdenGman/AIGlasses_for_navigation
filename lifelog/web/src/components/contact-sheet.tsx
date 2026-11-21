"use client";

import { cloneElement, useEffect, useRef, useState } from "react";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import tokens from "../../design-tokens.json";
import type { ArchiveDay, Locale } from "@/lib/api/schemas";
import { t } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { FEATURED_DAY, formatKawara, formatNumber } from "@/lib/time";
import { withBasePath } from "@/lib/base-path";

// Five-step archive heat scale (design-tokens.json "heat"). The dark
// scale tops out at warm taupe (#B8A98E), never near-white, so the
// busiest days do not glare for low-vision readers.
const light = tokens.heat.light;
const dark = tokens.heat.dark;

type YearView = "grid" | "calendar" | "list";

export function ContactSheet({ days, locale }: { days: ArchiveDay[]; locale: Locale }) {
  const copy = t(locale);
  const theme = usePrefs().theme;
  const [view, setView] = useState<YearView>("grid");
  const list = view === "list";
  const scrollRef = useRef<HTMLDivElement>(null);

  // The year overflows horizontally on narrow screens; start at the
  // most recent days (far right) instead of January. The scrollable
  // element is the calendar library's own inner container. Scoped to
  // small viewports: an unconditional jump on desktop can shift cells
  // under the pointer while the page is settling.
  useEffect(() => {
    if (window.innerWidth > 640) return;
    const scroller = scrollRef.current?.querySelector<HTMLElement>(".react-activity-calendar__scroll-container");
    if (scroller && scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollLeft = scroller.scrollWidth;
    }
  }, [list]);
  const byDate = new Map(days.map((day) => [day.day, day]));
  const data: Activity[] = days.map((day) => ({
    date: day.day,
    count: day.frames,
    level: day.cell_state === "recorded" ? day.level : 0,
  }));

  return (
    <section aria-labelledby="contact-sheet">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <h2 id="contact-sheet" className="sr-only">
          {copy.heatmapLabel}
        </h2>
        <div className="flex gap-2" role="group" aria-label={copy.gridView}>
          {(
            [
              ["grid", copy.gridView],
              ["calendar", copy.calendarView],
              ["list", copy.listView],
            ] as Array<[YearView, string]>
          ).map(([name, label]) => (
            <button
              key={name}
              type="button"
              className={`btn-outline min-h-11 border px-3 text-sm ${view === name ? "border-ink bg-paper-raised" : "border-rule"}`}
              aria-pressed={view === name}
              onClick={() => setView(name)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <li className="inline-flex items-center gap-2"><i className="hatch inline-block h-3 w-3 border border-rule" aria-hidden="true" />{copy.legendPaused}</li>
        <li className="inline-flex items-center gap-2"><i className="slash-cell" aria-hidden="true" />{copy.legendDeleted}</li>
        <li className="inline-flex items-center gap-2"><i className="dash-cell" aria-hidden="true" />{copy.legendExpired}</li>
        <li className="inline-flex items-center gap-2"><i className="amber-tick" aria-hidden="true" />{copy.legendUncertain}</li>
      </ul>
      {view === "list" ? <DayTable days={days} locale={locale} /> : view === "calendar" ? (
        <CalendarView days={days} locale={locale} theme={theme} />
      ) : (
        <div>
          <p className="mono mb-2 text-xs text-ink-muted md:hidden" aria-hidden="true">&larr; {copy.scrollYear}</p>
          <div ref={scrollRef} className="overflow-x-auto">
          <svg width="0" height="0" aria-hidden="true">
            <defs>
              <pattern id="cell-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="var(--paused-hatch)" strokeWidth="1" />
              </pattern>
            </defs>
          </svg>
          <ActivityCalendar
            data={data}
            blockSize={22}
            blockMargin={4}
            blockRadius={0}
            fontSize={15}
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
              const x = Number(block.props.x ?? 0);
              const y = Number(block.props.y ?? 0);
              const size = Number(block.props.width ?? 22);
              const fill = day.cell_state === "paused" ? "url(#cell-hatch)" : day.cell_state === "deleted" || day.cell_state === "expired" ? "transparent" : undefined;
              return (
                <a href={withBasePath(day.has_summary ? `/day/${day.day}/summary` : `/day/${day.day}`)} aria-label={name}>
                  {cloneElement(block, {
                    fill: fill ?? block.props.fill,
                    stroke: day.day === FEATURED_DAY ? "var(--ink)" : day.cell_state === "expired" ? "var(--ink-muted)" : "var(--rule)",
                    strokeWidth: day.day === FEATURED_DAY ? 2 : 1,
                    strokeDasharray: day.cell_state === "expired" ? "2 2" : undefined,
                  })}
                  {day.cell_state === "deleted" ? (
                    <line x1={x + 3} y1={y + size - 3} x2={x + size - 3} y2={y + 3} stroke="var(--ink-muted)" strokeWidth={1.25} />
                  ) : null}
                  {day.uncertain_items > 0 ? (
                    <circle cx={x + size - 4} cy={y + 4} r={2.25} fill="var(--uncertain-rule)" />
                  ) : null}
                  <title>{name}</title>
                </a>
              );
            }}
          />
          </div>
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

/**
 * Second view of the year: one card per month, every day a numbered
 * cell. The contact sheet stays the default — this view trades the
 * density of the heatmap for dates you can read at a glance. Cell
 * states reuse the same encodings as the grid (hatch = paused,
 * struck number = deleted, dashed = expired, amber dot = uncertain).
 */
function CalendarView({ days, locale, theme }: { days: ArchiveDay[]; locale: Locale; theme: "light" | "dark" }) {
  const copy = t(locale);
  const heat = theme === "dark" ? dark : light;
  const intl = locale === "zh-CN" ? "zh-CN" : "en-GB";
  const months = [...new Set(days.map((day) => day.day.slice(0, 7)))];
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 5 + i))),
  );
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-3">
      {months.map((month) => {
        const rows = days.filter((day) => day.day.startsWith(month));
        const first = rows[0];
        if (!first) return null;
        const [y, m] = month.split("-").map(Number);
        const offset = (new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, 1)).getUTCDay() + 6) % 7;
        const title = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(
          new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, 1)),
        );
        return (
          <section key={month} aria-label={title} className="border border-rule p-4">
            <h3 className="eyebrow">{title}</h3>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.8125rem] text-ink-muted" aria-hidden="true">
              {weekdays.map((name, i) => (
                <span key={i} className="py-1">{name}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank-${i}`} aria-hidden="true" />
              ))}
              {rows.map((day) => {
                const level = Math.min(4, Math.max(0, day.level));
                const recorded = day.cell_state === "recorded";
                const onDarkCell = recorded && ((theme === "light" && level >= 3) || (theme === "dark" && level <= 2));
                return (
                  <a
                    key={day.day}
                    href={withBasePath(day.has_summary ? `/day/${day.day}/summary` : `/day/${day.day}`)}
                    aria-label={cellName(day, locale, copy)}
                    className={`relative flex h-11 items-start justify-start border p-1 no-underline sm:h-12 ${
                      day.day === FEATURED_DAY
                        ? "border-2 border-ink"
                        : day.cell_state === "expired"
                          ? "border-dashed border-rule"
                          : "border-rule"
                    } ${day.cell_state === "paused" ? "hatch" : ""}`}
                    style={recorded ? { background: heat[level], color: onDarkCell ? "var(--paper)" : "var(--ink)" } : undefined}
                  >
                    <span className={`mono text-[0.8125rem] ${day.cell_state === "deleted" ? "text-ink-muted line-through" : ""}`}>
                      {Number(day.day.slice(8))}
                    </span>
                    {day.uncertain_items > 0 ? (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-uncertain-rule" aria-hidden="true" />
                    ) : null}
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
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
                  <a href={withBasePath(day.has_summary ? `/day/${day.day}/summary` : `/day/${day.day}`)} className="underline">
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
