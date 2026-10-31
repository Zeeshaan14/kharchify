"use client";

import { ArrowUpRight, PiggyBank, ReceiptText, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { CategoryBreakdown, TrendChart } from "@/components/charts";
import { ExpenseRow } from "@/components/expense-row";
import { MonthSwitcher, useMonth } from "@/components/month-switcher";
import {
  AnimatedMoney,
  Card,
  CardTitle,
  EmptyState,
  ErrorNote,
  ProgressBar,
  Ring,
  Skeleton,
  STATUS_COLOR,
} from "@/components/ui/primitives";
import { inrFmt, monthLabel } from "@/lib/format";
import { useDashboard, useExpensePages, useExpensesBetween, useMe } from "@/lib/queries";
import type { DashboardSummary } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, type: "spring" as const, stiffness: 140, damping: 20 },
});

export default function DashboardPage() {
  const { month, setMonth, isCurrent } = useMonth();
  const { data: me } = useMe();
  const { data, error, isPending } = useDashboard(isCurrent ? undefined : month);

  return (
    <>
      <PageHeader
        title={isCurrent ? `${greeting()}${me ? `, ${me.name.split(" ")[0]}` : ""}` : monthLabel(month)}
        subtitle={isCurrent ? "Here's your money this month" : "Month in review"}
        action={<MonthSwitcher month={month} onChange={setMonth} />}
      />
      <ErrorNote error={error} />
      {isPending || !data ? <DashboardSkeleton /> : <Dashboard data={data} isCurrent={isCurrent} />}
    </>
  );
}

function Dashboard({ data, isCurrent }: { data: DashboardSummary; isCurrent: boolean }) {
  const monthly = data.monthly_budget;
  const daily = data.daily_budget;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Hero */}
      <motion.div {...rise(0)} className="lg:col-span-2">
        <div className="relative h-full overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-accent/90 via-accent/70 to-[#5b3fd9] p-6 text-white shadow-[0_30px_60px_-30px_var(--accent)]">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-black/10 blur-2xl" />
          {isCurrent && data.safe_to_spend_today !== null ? (
            <div className="relative">
              <p className="flex items-center gap-1.5 text-sm text-white/80">
                <Sparkles className="size-4" /> Safe to spend today
              </p>
              <AnimatedMoney value={data.safe_to_spend_today} className="mt-2 block text-5xl font-semibold sm:text-6xl" />
              <p className="mt-3 text-sm text-white/75">
                {inrFmt(monthly!.remaining, { whole: true })} left for {data.days_left}{" "}
                {data.days_left === 1 ? "day" : "days"} · spent {inrFmt(data.spent_today)} today
              </p>
            </div>
          ) : (
            <div className="relative">
              <p className="text-sm text-white/80">{isCurrent ? "Spent this month" : `Spent in ${monthLabel(data.month)}`}</p>
              <AnimatedMoney value={data.month_total} className="mt-2 block text-5xl font-semibold sm:text-6xl" />
              {isCurrent && (
                <Link href="/budgets" className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-white/25">
                  <PiggyBank className="size-3.5" /> Set a monthly budget to see what&apos;s safe to spend
                </Link>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Monthly ring */}
      <motion.div {...rise(1)}>
        <Card className="flex h-full flex-col items-center justify-center gap-3">
          {monthly ? (
            <>
              <Ring percent={monthly.percent} color={STATUS_COLOR[monthly.status]}>
                <div>
                  <p className="num text-2xl font-semibold">{monthly.percent}%</p>
                  <p className="text-[11px] text-muted">of budget</p>
                </div>
              </Ring>
              <p className="text-center text-sm">
                <span className="num font-semibold">{inrFmt(data.month_total, { whole: true })}</span>
                <span className="text-muted"> of {inrFmt(monthly.limit, { whole: true })}</span>
              </p>
              <p className="text-xs" style={{ color: STATUS_COLOR[monthly.status] }}>
                {Number(monthly.remaining) >= 0
                  ? `${inrFmt(monthly.remaining, { whole: true })} left`
                  : `${inrFmt(-Number(monthly.remaining), { whole: true })} over`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">This month</p>
              <p className="num text-3xl font-semibold">{inrFmt(data.month_total, { whole: true })}</p>
              <Link href="/budgets" className="text-xs text-accent hover:underline">
                Add a budget →
              </Link>
            </>
          )}
        </Card>
      </motion.div>

      {/* Today */}
      <motion.div {...rise(2)}>
        <Card className="h-full">
          <CardTitle>Today</CardTitle>
          <p className="num text-3xl font-semibold">{inrFmt(data.spent_today)}</p>
          {daily ? (
            <>
              <ProgressBar percent={daily.percent} status={daily.status} className="mt-4" />
              <p className="mt-2 text-xs text-muted">
                {Number(daily.remaining) >= 0
                  ? `${inrFmt(daily.remaining)} left of ${inrFmt(daily.limit, { whole: true })} daily limit`
                  : `${inrFmt(-Number(daily.remaining))} over your ${inrFmt(daily.limit, { whole: true })} daily limit`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted">No daily limit set</p>
          )}
          {isCurrent && <TodayList day={data.today} />}
        </Card>
      </motion.div>

      {/* Trend */}
      <motion.div {...rise(3)} className="lg:col-span-2">
        <Card className="h-full">
          <CardTitle
            action={
              <Link href="/calendar" className="flex items-center gap-0.5 text-xs text-muted hover:text-fg">
                Calendar <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            Daily spending
          </CardTitle>
          {data.daily.length ? (
            <TrendChart daily={data.daily} dailyLimit={daily?.limit} />
          ) : (
            <EmptyState icon={<ReceiptText className="size-5" />} title="Nothing yet this month" />
          )}
        </Card>
      </motion.div>

      {/* Categories */}
      <motion.div {...rise(4)} className="lg:col-span-2">
        <Card className="h-full">
          <CardTitle>Where it went</CardTitle>
          {data.by_category.length ? (
            <CategoryBreakdown rows={data.by_category} monthTotal={data.month_total} />
          ) : (
            <EmptyState icon={<PiggyBank className="size-5" />} title="No spending yet" hint="Tap + to add your first expense." />
          )}
        </Card>
      </motion.div>

      {/* Top + recent */}
      <motion.div {...rise(5)} className="space-y-4">
        <Card>
          <CardTitle>Biggest this month</CardTitle>
          {data.top_expenses.length ? (
            <div className="-mx-2">
              {data.top_expenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} showDate />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </Card>
        {isCurrent && <RecentCard />}
      </motion.div>
    </div>
  );
}

function TodayList({ day }: { day: string }) {
  const { data: items = [] } = useExpensesBetween(day, day);
  if (!items.length) return <p className="mt-6 text-sm text-muted">Nothing spent yet today ✨</p>;
  return (
    <div className="-mx-2 mt-4 border-t border-line pt-2">
      {items.slice(0, 4).map((e) => (
        <ExpenseRow key={e.id} expense={e} />
      ))}
      {items.length > 4 && <p className="px-2 pt-1 text-xs text-muted">+{items.length - 4} more</p>}
    </div>
  );
}

function RecentCard() {
  const { data } = useExpensePages({});
  const items = data?.pages[0]?.items.slice(0, 5) ?? [];
  return (
    <Card>
      <CardTitle
        action={
          <Link href="/expenses" className="flex items-center gap-0.5 text-xs text-muted hover:text-fg">
            All <ArrowUpRight className="size-3.5" />
          </Link>
        }
      >
        Recent
      </CardTitle>
      <div className="-mx-2">
        {items.map((e) => (
          <ExpenseRow key={e.id} expense={e} showDate />
        ))}
        {data && !items.length && <p className="px-2 text-sm text-muted">No expenses yet.</p>}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-48 rounded-3xl lg:col-span-2" />
      <Skeleton className="h-48 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
    </div>
  );
}
