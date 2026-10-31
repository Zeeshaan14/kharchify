"use client";

import { clsx } from "clsx";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, Flame, Plus, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useExpenseSheet } from "@/components/expense-sheet";
import { ExpenseRow } from "@/components/expense-row";
import { MonthSwitcher, useMonth } from "@/components/month-switcher";
import { Button, Card, EmptyState, ErrorNote, Skeleton } from "@/components/ui/primitives";
import { useCategoryLookup } from "@/lib/categories";
import { dayLabel, inrCompact, inrFmt } from "@/lib/format";
import { useDashboard, useExpensesBetween } from "@/lib/queries";
import type { Expense } from "@/lib/types";

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
  function tint(total: number) {
    if (!total) return undefined;
    if (limit) {
      const r = total / limit;
      const color = r > 1 ? "var(--bad)" : r >= 0.8 ? "var(--warn)" : "var(--good)";
      return `color-mix(in oklab, ${color} ${Math.round(12 + Math.min(r, 1.5) * 16)}%, var(--surface-2))`;
    }
    return `color-mix(in oklab, var(--accent) ${Math.round(10 + (total / maxDay) * 35)}%, var(--surface-2))`;
  }

  return (
    <>
      <PageHeader title="Calendar" subtitle="Your spending, day by day" action={<MonthSwitcher month={month} onChange={setMonth} />} />
      <ErrorNote error={error} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat icon={<Sparkles className="size-4 text-good" />} label="No-spend days" value={String(noSpendDays)} />
        <Stat
          icon={<Flame className="size-4 text-bad" />}
          label="Biggest day"
          value={biggest ? inrCompact(biggest[1]) : "—"}
          hint={biggest ? dayLabel(biggest[0], "d MMM") : undefined}
        />
        <Stat
          icon={<CalendarDays className="size-4 text-warn" />}
          label="Over daily limit"
          value={overDays === null ? "—" : String(overDays)}
          hint={overDays === null ? "no limit set" : "days"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-3 sm:p-5">
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
                      onClick={() => setSelected(key)}
                      className={clsx(
                        "relative flex aspect-square flex-col rounded-xl p-1.5 text-left transition sm:rounded-2xl sm:p-2",
                        !inMonth && "invisible",
                        future ? "text-faint" : "hover:ring-1 hover:ring-line",
                        selectedDay === key && "ring-2 ring-accent!",
                      )}
                      style={{ background: tint(total) ?? "var(--surface-2)" }}
                    >
                      <span className={clsx("text-xs font-medium sm:text-sm", key === today && "grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white sm:size-6")}>
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

        <Card className="lg:sticky lg:top-8 lg:self-start">
          <AnimatePresence mode="wait">
            {selectedDay ? (
              <motion.div key={selectedDay} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted">{dayLabel(selectedDay, "EEEE")}</p>
                    <p className="text-lg font-semibold">{dayLabel(selectedDay, "d MMMM")}</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-2xl font-semibold">{inrFmt(totals.get(selectedDay) ?? 0)}</p>
                    {limit !== null && selectedDay <= today && (
                      <p className="text-xs text-muted">of {inrFmt(limit, { whole: true })} limit</p>
                    )}
                  </div>
                </div>
                <div className="-mx-2">
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
    </>
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
