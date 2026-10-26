"use client";

import { useState } from "react";
import { METRIC_GROUPS, weekLabel, type WeeklyMetrics } from "@/lib/pilot";

type Metric = keyof Omit<WeeklyMetrics, "week_start">;

const KEY_COLUMNS: [Metric, string][] = [
  ["signups", "Sign-ups"],
  ["active_users", "Active"],
  ["returning_users", "Returning"],
  ["reports", "Reports"],
  ["corroborations", "Got this too"],
  ["checks", "Checks"],
];

const KEY_SET = new Set(KEY_COLUMNS.map(([key]) => key));
const ALL_COLUMNS: [Metric, string][] = [
  ...KEY_COLUMNS,
  ...METRIC_GROUPS.flatMap((g) => g.metrics).filter(([key]) => !KEY_SET.has(key)),
];

/** Weeks newest first; the first is the current, partial week. */
export function WeeklyTable({ weeks }: { weeks: WeeklyMetrics[] }) {
  const [showAll, setShowAll] = useState(false);
  const columns = showAll ? ALL_COLUMNS : KEY_COLUMNS;
  const label = (w: WeeklyMetrics, i: number) => `${weekLabel(w.week_start)}${i === 0 ? " (so far)" : ""}`;

  return (
    <div className="space-y-4">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => setShowAll(e.target.checked)}
          className="size-5 accent-accent"
        />
        Show all columns
      </label>

      <ul className="space-y-3 sm:hidden">
        {weeks.map((w, i) => (
          <li key={w.week_start} className="rounded-xl border-2 border-border p-4">
            <h3 className="mb-2 text-lg font-bold">Week of {label(w, i)}</h3>
            <dl className="divide-y divide-border">
              {columns.map(([key, name]) => (
                <div key={key} className="flex justify-between gap-4 py-2">
                  <dt>{name}</dt>
                  <dd className="font-bold tabular-nums">{w[key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border-2 border-border sm:block">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 border-b-2 border-border bg-background p-3 whitespace-nowrap">
                Week of
              </th>
              {columns.map(([key, name]) => (
                <th key={key} scope="col" className="border-b-2 border-border p-3 text-right whitespace-nowrap">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={w.week_start}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-border bg-background p-3 font-bold whitespace-nowrap"
                >
                  {label(w, i)}
                </th>
                {columns.map(([key]) => (
                  <td key={key} className="border-b border-border p-3 text-right tabular-nums">
                    {w[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
