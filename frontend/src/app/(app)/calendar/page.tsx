"use client";

import { clsx } from "clsx";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, Flame, Plus, Sparkles, Target } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useExpenseSheet } from "@/components/expense-sheet";
import { ExpenseRow } from "@/components/expense-row";
import { MonthSwitcher, useMonth } from "@/components/month-switcher";
import { Button, Card, EmptyState, ErrorNote, Money, ProgressBar, Skeleton, STATUS_COLOR } from "@/components/ui/primitives";
import { useCategoryLookup } from "@/lib/categories";
import { dayLabel, inrCompact, monthLabel } from "@/lib/format";
import { useDashboard, useExpensesBetween } from "@/lib/queries";
import type { DashboardSummary, Expense } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const iso = (d: Date) => format(d, "yyyy-MM-dd");

export default function CalendarPage() {
  const { month, setMonth, isCurrent } = useMonth();
  const first = parseISO(`${month}-01`);
  const { data: summary, error, isPending } = useDashboard(isCurrent ? undefined : month);
  const { data: expenses = [] } = useExpensesBetween(iso(startOfMonth(first)), iso(endOfMonth(first)));
  const lookup = useCategoryLookup();
  const { openNew } = useExpenseSheet();

  const today = summary?.today ?? iso(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDay = selected && selected.startsWith(month) ? selected : isCurrent ? today : null;

  const totals = useMemo(() => new Map((summary?.daily ?? []).map((d) => [d.day, Number(d.total)])), [summary]);
  const byDay = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) map.set(e.spent_on, [...(map.get(e.spent_on) ?? []), e]);
    return map;
  }, [expenses]);

  const limit = summary?.daily_budget ? Number(summary.daily_budget.limit) : null;
  const maxDay = Math.max(1, ...totals.values());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(first), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(first), { weekStartsOn: 1 }),
  });

  // Stats come straight from the API's per-day totals.
  const past = [...totals.entries()];
  const noSpendDays = past.filter(([, t]) => t === 0).length;
  const biggest = past.reduce<[string, number] | null>((best, d) => (d[1] > (best?.[1] ?? 0) ? d : best), null);
  const overDays = limit ? past.filter(([, t]) => t > limit).length : null;

  /** Tint by share of the daily limit (green → amber → red), or by share of the biggest day. */
  function cellStyle(total: number): React.CSSProperties {
    if (!total) return { background: "var(--surface-2)" };
    if (limit) {
      const r = total / limit;
      const color = r > 1 ? "var(--bad)" : r >= 0.8 ? "var(--warn)" : "var(--good)";
      return {
        background: `linear-gradient(160deg, color-mix(in oklab, ${color} ${Math.round(14 + Math.min(r, 1.5) * 16)}%, transparent), color-mix(in oklab, ${color} 6%, transparent))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 30%, transparent)${r > 1 ? `, 0 0 18px -6px ${color}` : ""}`,
      };
    }
    return {
      background: `color-mix(in oklab, var(--accent) ${Math.round(10 + (total / maxDay) * 40)}%, transparent)`,
      boxShadow: "inset 0 0 0 1px var(--glass-border)",
    };
  }

  // On phones the day panel sits below the grid; bring it into view when a day is tapped.
  const panelRef = useRef<HTMLDivElement>(null);
  function pick(day: string) {
    setSelected(day);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  }

  return (
    <>
      <PageHeader title="Calendar" subtitle="Your spending, day by day" inline action={<MonthSwitcher month={month} onChange={setMonth} />} />
      <ErrorNote error={error} />

      {/*
        Phone: budget strip → calendar → selected day → stats (calendar is on the first screen).
        Desktop: calendar on the left; budget, selected day and stats stacked on the right.
      */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="lg:col-start-2 lg:row-start-1">
          {summary ? <BudgetStrip summary={summary} isCurrent={isCurrent} /> : <Skeleton className="h-24" />}
        </div>

        <Card className="p-3 sm:p-5 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          {isPending ? (
            <Skeleton className="h-96" />
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-faint">
                {WEEKDAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <motion.div key={month} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-7 gap-1.5">
                {days.map((d) => {
                  const key = iso(d);
                  const inMonth = isSameMonth(d, first);
                  const future = key > today;
                  const total = totals.get(key) ?? 0;
                  const icons = [...new Set((byDay.get(key) ?? []).map((e) => e.category.id))].slice(0, 3);
                  return (
                    <button
                      key={key}
                      disabled={!inMonth}
                      onClick={() => pick(key)}
                      className={clsx(
                        "relative flex aspect-square flex-col rounded-xl p-1.5 text-left transition sm:rounded-2xl sm:p-2",
                        !inMonth && "invisible",
                        future ? "text-faint" : "hover:ring-1 hover:ring-line",
                        selectedDay === key && "ring-2 ring-accent-2! shadow-[0_0_20px_-4px_var(--accent-2)]!",
                      )}
                      style={cellStyle(total)}
                    >
                      <span className={clsx("text-xs font-medium sm:text-sm", key === today && "bg-accent-gradient grid size-5 place-items-center rounded-full text-[11px] text-white shadow-[0_0_12px_var(--accent)] sm:size-6")}>
                        {d.getDate()}
                      </span>
                      {total > 0 && (
                        <span className="num mt-auto hidden truncate text-[11px] font-semibold sm:block">{inrCompact(total)}</span>
                      )}
                      {icons.length > 0 && (
                        <span className="absolute right-1 top-1.5 flex -space-x-0.5 sm:right-1.5">
                          {icons.map((id) => (
                            <span key={id} className="size-1.5 rounded-full ring-1 ring-surface" style={{ background: lookup.get(id)?.color ?? "var(--muted)" }} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
              <Legend hasLimit={limit !== null} />
            </>
          )}
        </Card>

        <div ref={panelRef} className="scroll-mt-4 lg:col-start-2 lg:row-start-2">
          <Card>
            <AnimatePresence mode="wait">
              {selectedDay ? (
                <motion.div key={selectedDay} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="label">{dayLabel(selectedDay, "EEEE")}</p>
                      <p className="font-display text-lg font-semibold">{dayLabel(selectedDay, "d MMMM")}</p>
                    </div>
                    <div className="text-right">
                      <Money value={totals.get(selectedDay) ?? 0} className="text-2xl font-semibold" />
                      {limit !== null && selectedDay <= today && (
                        <p className="text-xs text-muted">
                          of <Money value={limit} whole /> limit
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="-mx-2 max-h-[22rem] overflow-y-auto">
                    {(byDay.get(selectedDay) ?? []).map((e) => (
                      <ExpenseRow key={e.id} expense={e} />
                    ))}
                  </div>
                  {!byDay.get(selectedDay)?.length && (
                    <EmptyState icon={<Sparkles className="size-5" />} title={selectedDay > today ? "Hasn't happened yet" : "No spending — nice!"} />
                  )}
                  {selectedDay <= today && (
                    <Button variant="soft" className="mt-3 w-full" onClick={() => openNew(selectedDay)}>
                      <Plus className="size-4" /> Add for this day
                    </Button>
                  )}
                </motion.div>
              ) : (
                <EmptyState icon={<CalendarDays className="size-5" />} title="Pick a day" hint="Tap any day to see what you spent." />
              )}
            </AnimatePresence>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:col-start-2 lg:row-start-3">
          <Stat icon={<Sparkles className="size-4 text-good" />} label="No-spend" value={String(noSpendDays)} hint="days with ₹0" />
          <Stat
            icon={<Flame className="size-4 text-bad" />}
            label="Biggest day"
            value={biggest ? inrCompact(biggest[1]) : "—"}
            hint={biggest ? dayLabel(biggest[0], "d MMM") : undefined}
          />
          <Stat
            icon={<CalendarDays className="size-4 text-warn" />}
            label="Over limit"
            value={overDays === null ? "—" : String(overDays)}
            hint={overDays === null ? "no limit set" : "days"}
          />
        </div>
      </div>
    </>
  );
}

/** Compact month budget: spent of limit, what's left, a bar, and which daily limit colours the days. */
function BudgetStrip({ summary, isCurrent }: { summary: DashboardSummary; isCurrent: boolean }) {
  const monthly = summary.monthly_budget;
  const daily = summary.daily_budget;
  const name = monthLabel(summary.month).split(" ")[0];

  if (!monthly) {
    return (
      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="label">No budget for {name}</p>
          <p className="mt-0.5 text-sm">
            Spent <Money value={summary.month_total} whole className="font-semibold" />
          </p>
        </div>
        <Link href="/budgets" className="shrink-0 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold hover:bg-surface-3">
          Set budget →
        </Link>
      </Card>
    );
  }

  const over = Number(monthly.remaining) < 0;
  const color = STATUS_COLOR[monthly.status];
  return (
    <Card className="p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label flex items-center gap-1.5">
            <Target className="size-3.5" style={{ color }} /> {name} budget
          </p>
          <p className="mt-1 text-sm text-muted">
            <Money value={monthly.spent} whole className="text-lg font-semibold text-fg" /> of <Money value={monthly.limit} whole />
          </p>
        </div>
        <div className="text-right">
          <Money value={monthly.remaining} whole className="text-lg font-semibold" style={{ color }} />
          <p className="text-[11px] text-muted">{over ? "over budget" : "left"}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ProgressBar percent={monthly.percent} status={monthly.status} className="h-1.5 flex-1" />
        <span className="num text-[11px] font-semibold" style={{ color }}>
          {monthly.percent}%
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {isCurrent && summary.safe_to_spend_today !== null && (
          <>
            Safe today <Money value={summary.safe_to_spend_today} whole className="font-semibold text-accent-2" /> ·{" "}
          </>
        )}
        {daily ? (
          <>
            days coloured vs <Money value={daily.limit} whole className="text-fg" />/day
          </>
        ) : (
          <Link href="/budgets" className="text-accent-2 hover:underline">
            add a daily limit to colour days
          </Link>
        )}
      </p>
    </Card>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-start gap-1.5 text-xs leading-tight text-muted">
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="num text-xl font-semibold">{value}</p>
      {hint && <p className="text-[11px] text-faint">{hint}</p>}
    </Card>
  );
}

function Legend({ hasLimit }: { hasLimit: boolean }) {
  const items = hasLimit
    ? [
        ["var(--good)", "under 80%"],
        ["var(--warn)", "80–100%"],
        ["var(--bad)", "over limit"],
      ]
    : [["var(--accent)", "darker = more spent"]];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted">
      {items.map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: `color-mix(in oklab, ${color} 40%, var(--surface-2))` }} />
          {label}
        </span>
      ))}
    </div>
  );
}
