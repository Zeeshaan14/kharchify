"use client";

import { clsx } from "clsx";
import { format, getDaysInMonth, parseISO } from "date-fns";
import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCategoryLookup } from "@/lib/categories";
import { dayLabel, inrCompact } from "@/lib/format";
import type { CategorySpend, DashboardSummary } from "@/lib/types";
import { CategoryBadge, Money, ProgressBar } from "./ui/primitives";

type Daily = DashboardSummary["daily"];

const axisTick = { fill: "var(--faint)", fontSize: 11 };

function ChartTooltip({ day, rows }: { day: string; rows: { label: string; value: number; color: string }[] }) {
  return (
    <div className="glass rounded-2xl px-3.5 py-2.5 text-xs">
      <p className="mb-1 text-muted">{dayLabel(day)}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
          <span className="text-muted">{r.label}</span>
          <Money value={r.value} className="ml-auto pl-3 text-sm font-semibold" />
        </p>
      ))}
    </div>
  );
}

/**
 * Burn-up chart: running month total vs a straight line from ₹0 to the monthly budget.
 * Above the line = spending faster than the budget allows.
 */
export function PaceChart({ month, daily, monthlyLimit }: { month: string; daily: Daily; monthlyLimit?: string }) {
  const gid = `pace${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const first = parseISO(`${month}-01`);
  const days = getDaysInMonth(first);
  const byDay = new Map(daily.map((d) => [d.day, Number(d.cumulative)]));
  // Whole month on the x-axis; days after today have no value yet.
  const data = Array.from({ length: days }, (_, i) => {
    const day = format(new Date(first.getFullYear(), first.getMonth(), i + 1), "yyyy-MM-dd");
    return { day, spent: byDay.get(day) };
  });
  const last = daily.at(-1);
  const limit = monthlyLimit ? Number(monthlyLimit) : undefined;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tickFormatter={(d: string) => String(Number(d.slice(8)))} tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
          <YAxis tickFormatter={inrCompact} tick={axisTick} axisLine={false} tickLine={false} width={52} domain={[0, (max: number) => Math.max(max, limit ?? 0) * 1.08]} />
          <Tooltip
            cursor={{ stroke: "var(--glass-border)", strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.length && payload[0].payload.spent !== undefined ? (
                <ChartTooltip day={payload[0].payload.day} rows={[{ label: "Spent so far", value: payload[0].payload.spent, color: "var(--accent)" }]} />
              ) : null
            }
          />
          {limit !== undefined && (
            <>
              <ReferenceLine
                segment={[
                  { x: data[0].day, y: 0 },
                  { x: data[days - 1].day, y: limit },
                ]}
                stroke="var(--muted)"
                strokeDasharray="5 6"
                strokeOpacity={0.6}
                ifOverflow="extendDomain"
              />
              <ReferenceLine y={limit} stroke="var(--bad)" strokeOpacity={0.35} strokeDasharray="2 6" label={{ value: "budget", position: "insideTopLeft", fill: "var(--bad)", fontSize: 10, opacity: 0.8 }} />
            </>
          )}
          <Area type="monotone" dataKey="spent" stroke={`url(#${gid}-line)`} strokeWidth={3} fill={`url(#${gid}-fill)`} connectNulls={false} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--bg)", fill: "var(--accent-2)" }} animationDuration={1000} style={{ filter: "drop-shadow(0 0 10px var(--accent))" }} />
          {last && (
            <ReferenceDot x={last.day} y={Number(last.cumulative)} r={6} fill="var(--accent-2)" stroke="var(--bg)" strokeWidth={3} style={{ filter: "drop-shadow(0 0 8px var(--accent-2))" }} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** One bar per day; days over the daily limit glow red. */
export function DailyBars({ daily, dailyLimit }: { daily: Daily; dailyLimit?: string }) {
  const gid = `bars${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const limit = dailyLimit ? Number(dailyLimit) : undefined;
  const data = daily.map((d) => ({ day: d.day, total: Number(d.total) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tickFormatter={(d: string) => String(Number(d.slice(8)))} tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
          <YAxis tickFormatter={inrCompact} tick={axisTick} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", radius: 8 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltip day={payload[0].payload.day} rows={[{ label: "Spent", value: payload[0].payload.total, color: limit && payload[0].payload.total > limit ? "var(--bad)" : "var(--accent-2)" }]} />
              ) : null
            }
          />
          {limit !== undefined && (
            <ReferenceLine y={limit} stroke="var(--warn)" strokeDasharray="4 5" strokeOpacity={0.7} label={{ value: "daily limit", position: "insideTopRight", fill: "var(--warn)", fontSize: 10 }} />
          )}
          <Bar dataKey="total" radius={[6, 6, 2, 2]} animationDuration={800}>
            {data.map((d) => (
              <Cell key={d.day} fill={limit && d.total > limit ? "var(--bad)" : `url(#${gid})`} fillOpacity={d.total ? 1 : 0.15} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny trend line for the hero card. */
export function Sparkline({ daily }: { daily: Daily }) {
  const gid = `spark${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const data = daily.slice(-14).map((d) => ({ day: d.day, total: Number(d.total) }));
  if (data.length < 2) return null;
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="total" stroke="var(--accent-2)" strokeWidth={2} fill={`url(#${gid})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut + category list; hovering/tapping a slice or row spotlights it. */
export function CategoryBreakdown({ rows, monthTotal }: { rows: CategorySpend[]; monthTotal: string }) {
  const lookup = useCategoryLookup();
  const [active, setActive] = useState<number | null>(null);
  const spent = rows.filter((r) => Number(r.total) > 0);
  const color = (id: number) => lookup.get(id)?.color ?? "#6B7280";
  const focus = active !== null ? spent[active] : null;

  return (
    <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
      <div className="relative mx-auto size-[220px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={spent.map((r) => ({ name: r.category.name, value: Number(r.total) }))}
              dataKey="value"
              innerRadius={78}
              outerRadius={102}
              paddingAngle={spent.length > 1 ? 2.5 : 0}
              cornerRadius={8}
              stroke="none"
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={(_, i) => setActive((a) => (a === i ? null : i))}
              animationDuration={900}
            >
              {spent.map((r, i) => (
                <Cell
                  key={r.category.id}
                  fill={color(r.category.id)}
                  opacity={active === null || active === i ? 1 : 0.2}
                  style={{ transition: "opacity 200ms", cursor: "pointer", filter: active === i ? `drop-shadow(0 0 10px ${color(r.category.id)})` : undefined }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="label">{focus ? `${focus.category.icon ?? ""} ${focus.category.name}` : "This month"}</p>
            <Money value={focus ? focus.total : monthTotal} whole className="mt-1 block text-2xl font-semibold" />
            {focus && <p className="mt-0.5 text-xs text-muted">{focus.share}% of spending</p>}
          </div>
        </div>
      </div>

      <ul className="grid gap-x-6 gap-y-1 lg:grid-cols-2">
        {rows.map((r) => {
          const i = spent.indexOf(r);
          const c = color(r.category.id);
          return (
            <li
              key={r.category.id}
              onMouseEnter={() => i >= 0 && setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={clsx("rounded-2xl px-2 py-2 transition", active !== null && (active === i ? "bg-surface-2" : "opacity-40"))}
            >
              <div className="flex items-center gap-3">
                <CategoryBadge icon={r.category.icon} color={c} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{r.category.name}</span>
                    <Money value={r.total} whole className="text-sm font-semibold" />
                  </div>
                  {r.budget ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar percent={r.budget.percent} status={r.budget.status} className="h-1.5 flex-1" />
                      <span className="num text-[10px] text-muted">{r.budget.percent}%</span>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(r.share, 2)}%`, background: c, boxShadow: `0 0 10px ${c}` }} />
                      </div>
                      <span className="num text-[10px] text-muted">{r.share}%</span>
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
