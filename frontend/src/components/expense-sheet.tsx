"use client";

import { clsx } from "clsx";
import { format, subDays } from "date-fns";
import { Trash2 } from "lucide-react";
import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useState } from "react";
import { PAYMENT_LABELS } from "@/lib/format";
import { useCategories, useDeleteExpense, useSaveExpense } from "@/lib/queries";
import type { Expense, ExpenseCreated, PaymentMethod } from "@/lib/types";
import { Button, CategoryBadge, ErrorNote, inputClass, Segmented } from "./ui/primitives";
import { Sheet } from "./ui/sheet";
import { useToast } from "./ui/toast";

type Target = { expense?: Expense; date?: string } | null;

const ExpenseSheetContext = createContext<{ openNew: (date?: string) => void; openEdit: (e: Expense) => void }>({
  openNew: () => {},
  openEdit: () => {},
});

export const useExpenseSheet = () => useContext(ExpenseSheetContext);

export function ExpenseSheetProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target>(null);
  const openNew = useCallback((date?: string) => setTarget({ date }), []);
  const openEdit = useCallback((expense: Expense) => setTarget({ expense }), []);
  const close = useCallback(() => setTarget(null), []);

  return (
    <ExpenseSheetContext.Provider value={{ openNew, openEdit }}>
      {children}
      <Sheet open={target !== null} onClose={close} title={target?.expense ? "Edit expense" : "Add expense"}>
        {/* Keyed so the form resets for each expense. */}
        {target && <ExpenseForm key={target.expense?.id ?? `new-${target.date}`} target={target} onDone={close} />}
      </Sheet>
    </ExpenseSheetContext.Provider>
  );
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function ExpenseForm({ target, onDone }: { target: NonNullable<Target>; onDone: () => void }) {
  const editing = target.expense;
  const toast = useToast();
  const { data: categories = [] } = useCategories();
  const save = useSaveExpense();
  const remove = useDeleteExpense();

  const today = iso(new Date());
  const [amount, setAmount] = useState(editing ? String(Number(editing.amount)) : "");
  const [categoryId, setCategoryId] = useState<number | null>(editing?.category.id ?? null);
  const [spentOn, setSpentOn] = useState(editing?.spent_on ?? target.date ?? today);
  const [method, setMethod] = useState<PaymentMethod>(editing?.payment_method ?? "upi");
  const [note, setNote] = useState(editing?.note ?? "");
  const [need, setNeed] = useState<"need" | "want" | "none">(
    editing?.is_need == null ? "none" : editing.is_need ? "need" : "want",
  );

  const valid = Number(amount) > 0 && categoryId !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const result = await save.mutateAsync({
      id: editing?.id,
      data: {
        amount,
        category_id: categoryId!,
        spent_on: spentOn,
        payment_method: method,
        note: note.trim() || null,
        is_need: need === "none" ? null : need === "need",
      },
    });
    toast(editing ? "Expense updated" : (result as ExpenseCreated).message);
    onDone();
  }

  async function del() {
    if (!editing) return;
    await remove.mutateAsync(editing.id);
    toast("Expense deleted");
    onDone();
  }

  const quickDates = [
    { label: "Today", value: today },
    { label: "Yesterday", value: iso(subDays(new Date(), 1)) },
  ];

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Big amount input */}
      <label className="flex items-baseline justify-center gap-1 rounded-3xl bg-surface-2 py-6">
        <span className="text-3xl font-medium text-muted">₹</span>
        <input
          autoFocus={!editing}
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => /^\d{0,10}(\.\d{0,2})?$/.test(e.target.value) && setAmount(e.target.value)}
          className="num min-w-[2ch] bg-transparent text-5xl font-semibold outline-none placeholder:text-faint"
          style={{ width: `${Math.max(amount.length, 1) + 0.5}ch` }}
          aria-label="Amount"
        />
      </label>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">Category</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={clsx(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-[11px] transition active:scale-95",
                categoryId === c.id ? "border-accent bg-accent-soft text-fg" : "border-transparent text-muted hover:bg-surface-2",
              )}
            >
              <CategoryBadge icon={c.icon} color={c.color} size="sm" />
              <span className="w-full truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">Date</p>
        <div className="flex gap-2">
          {quickDates.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => setSpentOn(d.value)}
              className={clsx(
                "rounded-xl px-3 py-2 text-xs font-medium transition",
                spentOn === d.value ? "bg-accent text-white" : "bg-surface-2 text-muted hover:text-fg",
              )}
            >
              {d.label}
            </button>
          ))}
          <input
            type="date"
            value={spentOn}
            max={today}
            onChange={(e) => e.target.value && setSpentOn(e.target.value)}
            className={clsx(inputClass, "h-auto flex-1 py-2 text-xs")}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">Paid with</p>
        <Segmented
          value={method}
          onChange={setMethod}
          options={(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => ({
            value: m,
            label: m === "netbanking" ? "Bank" : PAYMENT_LABELS[m],
          }))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={255}
          placeholder="Note (optional)"
          className={inputClass}
        />
        <Segmented
          value={need}
          onChange={setNeed}
          options={[
            { value: "need", label: "Need" },
            { value: "want", label: "Want" },
            { value: "none", label: "—" },
          ]}
        />
      </div>

      <ErrorNote error={save.error ?? remove.error} />

      <div className="flex gap-2">
        {editing && (
          <Button type="button" variant="danger" onClick={del} loading={remove.isPending} aria-label="Delete expense">
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={!valid} loading={save.isPending}>
          {editing ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
