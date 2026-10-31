"use client";

import { ArrowUpRight, CalendarClock, PiggyBank, ReceiptText, Sparkles, Sun, Wallet } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { CategoryBreakdown, DailyBars, PaceChart, Sparkline } from "@/components/charts";
import { ExpenseRow } from "@/components/expense-row";
import { MonthSwitcher, useMonth } from "@/components/month-switcher";
import {
  AnimatedMoney,
  Card,
  CardTitle,
  EmptyState,
  ErrorNote,
  Money,
  ProgressBar,
  Ring,
  Segmented,
  Skeleton,
  STATUS_COLOR,
} from "@/components/ui/primitives";
import { monthLabel } from "@/lib/format";
import { useDashboard, useExpensePages, useExpensesBetween, useMe } from "@/lib/queries";
import type { DashboardSummary } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 18, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { delay: i * 0.07, type: "spring" as const, stiffness: 130, damping: 20 },
});

export default function DashboardPage() {
  const { month, setMonth, isCurrent } = useMonth();
  const { data: me } = useMe();
  const { data, error, isPending } = useDashboard(isCurrent ? undefined : month);

  return (
    <>
      <PageHeader
        title={isCurrent ? `${greeting()}${me ? `, ${me.name.split(" ")[0]}` : ""}` : monthLabel(month)}
        subtitle={isCurrent ? "Your money, this month" : "Month in review"}
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
    <div className="space-y-4">
      <motion.div {...rise(0)}>
        <Hero data={data} isCurrent={isCurrent} />
      </motion.div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <motion.div {...rise(1)}>
          <Stat icon={<Sun className="size-4" />} label="Today" glow={daily ? STATUS_COLOR[daily.status] : undefined}>
            <Money value={data.spent_today} className="text-2xl font-semibold sm:text-3xl" />
            {daily ? (
              <>
                <ProgressBar percent={daily.percent} status={daily.status} className="mt-3" />
                <p className="mt-2 text-xs text-muted">
                  of <Money value={daily.limit} whole /> daily limit
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted">No daily limit</p>
            )}
          </Stat>
        </motion.div>
        <motion.div {...rise(2)}>
          <Stat icon={<Wallet className="size-4" />} label={isCurrent ? "This month" : "Month total"}>
            <Money value={data.month_total} whole className="text-2xl font-semibold sm:text-3xl" />
            {monthly ? (
              <>
                <ProgressBar percent={monthly.percent} status={monthly.status} className="mt-3" />
                <p className="mt-2 text-xs text-muted">
                  of <Money value={monthly.limit} whole /> budget
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted">No monthly budget</p>
            )}
          </Stat>
        </motion.div>
        {/* The hero already says how many days are left, so phones skip this tile. */}
        <motion.div {...rise(3)} className="hidden md:block">
          <Stat icon={<CalendarClock className="size-4" />} label="Days left">
            <p className="num text-2xl font-semibold sm:text-3xl">{data.days_left ?? "—"}</p>
            <p className="mt-2 text-xs text-muted">
              {data.days_left === null ? "Set a monthly budget to track pace" : `in ${monthLabel(data.month).split(" ")[0]}`}
            </p>
          </Stat>
        </motion.div>
      </div>

      {/* Chart + today */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div {...rise(4)} className="lg:col-span-2">
          <SpendingChart data={data} />
        </motion.div>
        <motion.div {...rise(5)}>
          {isCurrent ? <TodayCard day={data.today} /> : <TopCard data={data} />}
        </motion.div>
      </div>

      <motion.div {...rise(6)}>
        <Card>
          <CardTitle>Where it went</CardTitle>
          {data.by_category.length ? (
            <CategoryBreakdown rows={data.by_category} monthTotal={data.month_total} />
          ) : (
            <EmptyState icon={<PiggyBank className="size-5" />} title="No spending yet" hint="Tap + to add your first expense." />
          )}
        </Card>
      </motion.div>

      {isCurrent && (
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div {...rise(7)}>
            <TopCard data={data} />
          </motion.div>
          <motion.div {...rise(8)}>
            <RecentCard />
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Hero({ data, isCurrent }: { data: DashboardSummary; isCurrent: boolean }) {
  const monthly = data.monthly_budget;
  const showSafe = isCurrent && data.safe_to_spend_today !== null;
  const over = monthly && Number(monthly.remaining) < 0;

  return (
    <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
      {/* neon wash */}
      <div className="pointer-events-none absolute -left-24 -top-32 size-96 rounded-full bg-accent/30 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 size-96 rounded-full bg-accent-2/15 blur-[100px]" />

      <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="label flex items-center gap-1.5 !text-fg/80">
            <Sparkles className="size-3.5 text-accent-2" />
            {showSafe ? "Safe to spend today" : isCurrent ? "Spent this month" : `Spent in ${monthLabel(data.month)}`}
          </p>
          <AnimatedMoney
            value={showSafe ? data.safe_to_spend_today! : data.month_total}
            className="mt-3 block text-6xl font-semibold leading-none sm:text-7xl"
          />
          <p className="mt-4 text-sm text-muted">
            {showSafe ? (
              <>
                {Number(monthly!.remaining) < 0 ? (
                  <>
                    <Money value={monthly!.remaining} whole className="font-semibold text-bad" /> over budget
                  </>
                ) : (
                  <>
                    <Money value={monthly!.remaining} whole className="font-semibold text-fg" /> left for {data.days_left}{" "}
                    {data.days_left === 1 ? "day" : "days"}
                  </>
                )}{" "}
                · <Money value={data.spent_today} className="text-fg" /> spent today
              </>
            ) : isCurrent ? (
              <Link href="/budgets" className="inline-flex items-center gap-1 font-medium text-accent-2 hover:underline">
                <PiggyBank className="size-4" /> Set a monthly budget to see what&apos;s safe to spend
              </Link>
            ) : (
              <>{data.daily.filter((d) => Number(d.total) === 0).length} no-spend days</>
            )}
          </p>
          {data.daily.length > 1 && (
            <div className="mt-5 max-w-md">
              <Sparkline daily={data.daily} />
              <p className="mt-1 text-[11px] text-faint">Last {Math.min(data.daily.length, 14)} days</p>
            </div>
          )}
        </div>

        {monthly && (
          <div className="flex items-center gap-5 self-center md:flex-col md:gap-3">
            <Ring percent={monthly.percent} color={STATUS_COLOR[monthly.status]} size={168} stroke={13}>
              <div>
                <p className="num text-3xl font-semibold">{monthly.percent}%</p>
                <p className="label mt-0.5 !text-[10px]">of budget</p>
              </div>
            </Ring>
            <div className="text-left md:text-center">
              <p className="text-sm font-semibold" style={{ color: STATUS_COLOR[monthly.status] }}>
                <Money value={monthly.remaining} whole /> {over ? "over" : "left"}
              </p>
              <p className="text-xs text-muted">
                of <Money value={monthly.limit} whole /> this month
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, glow, children }: { icon: ReactNode; label: string; glow?: string; children: ReactNode }) {
  return (
    <Card className="h-full p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid size-7 place-items-center rounded-lg border border-line bg-surface-2 text-muted"
          style={glow ? { color: glow, boxShadow: `0 0 14px -4px ${glow}` } : undefined}
        >
          {icon}
        </span>
        <span className="label">{label}</span>
      </div>
      {children}
    </Card>
  );
}

function SpendingChart({ data }: { data: DashboardSummary }) {
  const [view, setView] = useState<"pace" | "daily">(data.monthly_budget ? "pace" : "daily");
  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="label">{view === "pace" ? "Spending pace" : "Daily spending"}</h2>
          <p className="mt-1 text-xs text-faint">
            {view === "pace" ? "Running total vs. a steady path to your budget" : "Red bars broke the daily limit"}
          </p>
        </div>
        <Segmented
          className="w-40 shrink-0"
          value={view}
          onChange={setView}
          options={[
            { value: "pace", label: "Pace" },
            { value: "daily", label: "Daily" },
          ]}
        />
      </div>
      {data.daily.length === 0 ? (
        <EmptyState icon={<ReceiptText className="size-5" />} title="Nothing yet this month" />
      ) : view === "pace" ? (
        <PaceChart month={data.month} daily={data.daily} monthlyLimit={data.monthly_budget?.limit} />
      ) : (
        <DailyBars daily={data.daily} dailyLimit={data.daily_budget?.limit} />
      )}
      <Link href="/calendar" className="mt-2 inline-flex items-center gap-0.5 text-xs text-muted hover:text-fg">
        Open calendar <ArrowUpRight className="size-3.5" />
      </Link>
    </Card>
  );
}

function TodayCard({ day }: { day: string }) {
  const { data: items = [], isPending } = useExpensesBetween(day, day);
  return (
    <Card className="h-full">
      <CardTitle>Today&apos;s spends</CardTitle>
      {isPending ? (
        <Skeleton className="h-40" />
      ) : items.length ? (
        <div className="-mx-2">
          {items.slice(0, 5).map((e) => (
            <ExpenseRow key={e.id} expense={e} />
          ))}
          {items.length > 5 && <p className="px-2 pt-1 text-xs text-muted">+{items.length - 5} more</p>}
        </div>
      ) : (
        <EmptyState icon={<Sparkles className="size-5" />} title="Nothing spent yet today" hint="A no-spend day so far ✨" />
      )}
    </Card>
  );
}

function TopCard({ data }: { data: DashboardSummary }) {
  return (
    <Card className="h-full">
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
  );
}

function RecentCard() {
  const { data } = useExpensePages({});
  const items = data?.pages[0]?.items.slice(0, 5) ?? [];
  return (
    <Card className="h-full">
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
    <div className="space-y-4">
      <Skeleton className="h-72 rounded-[2rem]" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="col-span-2 h-32 md:col-span-1" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
