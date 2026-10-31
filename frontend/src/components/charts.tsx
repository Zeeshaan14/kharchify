"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { Area, AreaChart, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dayLabel, inrCompact, inrFmt } from "@/lib/format";
import type { CategorySpend } from "@/lib/types";
import { useCategoryLookup } from "@/lib/categories";
import { CategoryBadge, ProgressBar } from "./ui/primitives";

/** Daily spending as a smooth area, with the daily budget as a dashed line. */
export function TrendChart({ daily, dailyLimit }: { daily: { day: string; total: string }[]; dailyLimit?: string }) {
  const data = daily.map((d) => ({ day: d.day, total: Number(d.total) }));
  const limit = dailyLimit ? Number(dailyLimit) : undefined;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => String(Number(d.slice(8)))}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickFormatter={inrCompact}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 24 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-line bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
                  <p className="text-muted">{dayLabel(payload[0].payload.day)}</p>
                  <p className="num mt-0.5 text-sm font-semibold">{inrFmt(payload[0].payload.total)}</p>
                </div>
              ) : null
            }
          />
          {limit !== undefined && (
            <ReferenceLine
              y={limit}
              stroke="var(--warn)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{ value: "daily limit", position: "insideTopRight", fill: "var(--warn)", fontSize: 10 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--surface)" }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut + legend; hovering/tapping a slice or row highlights it and shows it in the centre. */
export function CategoryBreakdown({ rows, monthTotal }: { rows: CategorySpend[]; monthTotal: string }) {
  const lookup = useCategoryLookup();
  const [active, setActive] = useState<number | null>(null);
  const spent = rows.filter((r) => Number(r.total) > 0);
  const color = (id: number) => lookup.get(id)?.color ?? "#6B7280";
  const focus = active !== null ? spent[active] : null;

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
      <div className="relative mx-auto size-[200px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={spent.map((r) => ({ name: r.category.name, value: Number(r.total), id: r.category.id }))}
              dataKey="value"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={spent.length > 1 ? 3 : 0}
              cornerRadius={6}
              stroke="none"
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={(_, i) => setActive((a) => (a === i ? null : i))}
              animationDuration={800}
            >
              {spent.map((r, i) => (
                <Cell
                  key={r.category.id}
                  fill={color(r.category.id)}
                  opacity={active === null || active === i ? 1 : 0.25}
                  style={{ transition: "opacity 200ms", cursor: "pointer" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xs text-muted">{focus ? `${focus.category.icon ?? ""} ${focus.category.name}` : "Total"}</p>
            <p className="num text-xl font-semibold">{inrFmt(focus ? focus.total : monthTotal, { whole: true })}</p>
            {focus && <p className="text-xs text-muted">{focus.share}%</p>}
          </div>
        </div>
      </div>

      <ul className="space-y-1">
        {rows.map((r) => {
          const i = spent.indexOf(r);
          return (
            <li
              key={r.category.id}
              onMouseEnter={() => i >= 0 && setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={clsx(
                "rounded-2xl px-2 py-2 transition",
                active !== null && active === i ? "bg-surface-2" : "",
                active !== null && active !== i ? "opacity-50" : "",
              )}
            >
              <div className="flex items-center gap-3">
                <CategoryBadge icon={r.category.icon} color={color(r.category.id)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{r.category.name}</span>
                    <span className="num text-sm font-semibold">{inrFmt(r.total, { whole: true })}</span>
                  </div>
                  {r.budget ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar percent={r.budget.percent} status={r.budget.status} className="h-1.5 flex-1" />
                      <span className="num w-24 text-right text-[11px] text-muted">
                        of {inrFmt(r.budget.limit, { whole: true })}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${r.share}%`, background: color(r.category.id) }} />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
