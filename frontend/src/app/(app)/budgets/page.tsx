"use client";

import { clsx } from "clsx";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { type FormEvent, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button, Card, CategoryBadge, EmptyState, ErrorNote, IconButton, Money, ProgressBar, Ring, Segmented, Skeleton, STATUS_COLOR } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useCategoryLookup } from "@/lib/categories";
import { useBudgets, useCategories, useDeleteBudget, useSaveBudget } from "@/lib/queries";
import type { Budget, BudgetPeriod } from "@/lib/types";

const STATUS_TEXT = { ok: "On track", warning: "Getting close", over: "Over budget" } as const;

export default function BudgetsPage() {
  const { data: budgets, error, isPending } = useBudgets();
  const [editing, setEditing] = useState<Budget | "new" | null>(null);

  const overall = budgets?.filter((b) => !b.category) ?? [];
  const perCategory = budgets?.filter((b) => b.category) ?? [];

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Limits that keep you honest"
        action={
          <Button onClick={() => setEditing("new")} className="h-10">
            <Plus className="size-4" /> <span className="hidden sm:inline">New budget</span>
          </Button>
        }
      />
      <ErrorNote error={error} />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      ) : !budgets?.length ? (
        <Card>
          <EmptyState
            icon={<Target className="size-5" />}
            title="No budgets yet"
            hint="Start with a monthly limit — the dashboard will then tell you how much is safe to spend each day."
          />
          <div className="flex justify-center">
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Create a budget
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {overall.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {overall.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <OverallCard budget={b} onEdit={() => setEditing(b)} />
                </motion.div>
              ))}
            </div>
          )}
          {perCategory.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-sm font-medium text-muted">By category</h2>
              <Card className="space-y-1 p-2">
                {perCategory.map((b) => (
                  <CategoryBudgetRow key={b.id} budget={b} onEdit={() => setEditing(b)} />
                ))}
              </Card>
            </section>
          )}
        </div>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New budget" : "Edit budget"}>
        {editing && <BudgetForm key={editing === "new" ? "new" : editing.id} budget={editing === "new" ? null : editing} existing={budgets ?? []} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function OverallCard({ budget, onEdit }: { budget: Budget; onEdit: () => void }) {
  const p = budget.progress;
  const over = Number(p.remaining) < 0;
  return (
    <Card className="flex h-full items-center gap-5">
      <Ring percent={p.percent} color={STATUS_COLOR[p.status]} size={124} stroke={11}>
        <p className="num text-xl font-semibold">{p.percent}%</p>
      </Ring>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{budget.period === "monthly" ? "This month" : "Today"}</p>
            <Money value={budget.amount} whole className="mt-1 block text-3xl font-semibold" />
          </div>
          <IconButton onClick={onEdit} aria-label="Edit budget">
            <Pencil className="size-4" />
          </IconButton>
        </div>
        <p className="mt-2 text-sm text-muted">
          <Money value={p.spent} className="text-fg" /> spent
        </p>
        <p className="mt-1 text-sm font-medium" style={{ color: STATUS_COLOR[p.status] }}>
          <Money value={p.remaining} /> {over ? "over" : "left"} · {STATUS_TEXT[p.status]}
        </p>
      </div>
    </Card>
  );
}

function CategoryBudgetRow({ budget, onEdit }: { budget: Budget; onEdit: () => void }) {
  const color = useCategoryLookup().get(budget.category!.id)?.color;
  const p = budget.progress;
  return (
    <button onClick={onEdit} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-surface-2">
      <CategoryBadge icon={budget.category!.icon} color={color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {budget.category!.name} <span className="text-xs font-normal text-faint">· {budget.period}</span>
          </p>
          <p className="num text-sm">
            <Money value={p.spent} whole className="font-semibold" />
            <span className="text-muted"> / <Money value={p.limit} whole /></span>
          </p>
        </div>
        <ProgressBar percent={p.percent} status={p.status} className="mt-2" />
      </div>
    </button>
  );
}

function BudgetForm({ budget, existing, onDone }: { budget: Budget | null; existing: Budget[]; onDone: () => void }) {
  const toast = useToast();
  const save = useSaveBudget();
  const remove = useDeleteBudget();
  const { data: categories = [] } = useCategories();
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? "monthly");
  const [categoryId, setCategoryId] = useState<number | null>(budget?.category?.id ?? null);
  const [amount, setAmount] = useState(budget ? String(Number(budget.amount)) : "");

  const taken = (id: number | null) => !budget && existing.some((b) => b.period === period && (b.category?.id ?? null) === id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await save.mutateAsync({ id: budget?.id, period, category_id: categoryId, amount });
    toast(budget ? "Budget updated" : "Budget created");
    onDone();
  }

  async function del() {
    await remove.mutateAsync(budget!.id);
    toast("Budget deleted");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {!budget && (
        <>
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "daily", label: "Daily" },
            ]}
          />
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Applies to</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <PickTile active={categoryId === null} disabled={taken(null)} onClick={() => setCategoryId(null)} icon="✨" label="Everything" />
              {categories.map((c) => (
                <PickTile key={c.id} active={categoryId === c.id} disabled={taken(c.id)} onClick={() => setCategoryId(c.id)} icon={c.icon} label={c.name} />
              ))}
            </div>
          </div>
        </>
      )}

      <label className="flex items-baseline justify-center gap-1 rounded-3xl bg-surface-2 py-6">
        <span className="text-3xl font-medium text-muted">₹</span>
        <input
          autoFocus
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => /^\d{0,10}(\.\d{0,2})?$/.test(e.target.value) && setAmount(e.target.value)}
          className="num min-w-[2ch] bg-transparent text-5xl font-semibold outline-none placeholder:text-faint"
          style={{ width: `${Math.max(amount.length, 1) + 0.5}ch` }}
          aria-label="Budget amount"
        />
        <span className="text-sm text-muted">/{period === "monthly" ? "month" : "day"}</span>
      </label>

      <ErrorNote error={save.error ?? remove.error} />
      <div className="flex gap-2">
        {budget && (
          <Button type="button" variant="danger" onClick={del} loading={remove.isPending} aria-label="Delete budget">
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={!(Number(amount) > 0) || taken(categoryId)} loading={save.isPending}>
          {budget ? "Save" : "Create budget"}
        </Button>
      </div>
    </form>
  );
}

function PickTile({ active, disabled, onClick, icon, label }: { active: boolean; disabled: boolean; onClick: () => void; icon: string | null; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Already has a budget for this period" : undefined}
      className={clsx(
        "flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-[11px] transition disabled:opacity-30",
        active ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:text-fg",
      )}
    >
      <span className="text-lg">{icon ?? "•"}</span>
      <span className="w-full truncate text-center">{label}</span>
    </button>
  );
}
