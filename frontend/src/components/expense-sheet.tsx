"use client";

import { clsx } from "clsx";
import { format, subDays } from "date-fns";
import { ChevronDown, Delete, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useCategoryLookup } from "@/lib/categories";
import { PAYMENT_LABELS } from "@/lib/format";
import { useCategories, useDeleteExpense, useSaveExpense } from "@/lib/queries";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
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
  // "/?add=1" (the app shortcut) opens straight into a new expense.
  const [target, setTarget] = useState<Target>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("add") ? {} : null,
  );
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("add")) {
      url.searchParams.delete("add");
      window.history.replaceState(null, "", url);
    }
  }, []);
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
const AMOUNT_RE = /^\d{0,10}(\.\d{0,2})?$/;

function ExpenseForm({ target, onDone }: { target: NonNullable<Target>; onDone: () => void }) {
  const editing = target.expense;
  const toast = useToast();
  // Touch screens get the built-in keypad instead of the system keyboard.
  const touch = useCoarsePointer();
  const { data: categories = [] } = useCategories();
  const lookup = useCategoryLookup();
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
  // Details start open when editing or when anything differs from the defaults.
  const [details, setDetails] = useState(Boolean(editing) || spentOn !== today);

  const valid = Number(amount) > 0 && categoryId !== null;
  const selectedColor = categoryId ? lookup.get(categoryId)?.color : null;

  function press(key: string) {
    if (key === "back") return setAmount((a) => a.slice(0, -1));
    setAmount((a) => {
      const next = a === "0" && key !== "." ? key : a + key;
      return AMOUNT_RE.test(next) ? next : a;
    });
  }

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

  const [rupees, paise] = amount.split(".");

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Amount display (also a real input on keyboards) */}
      <label
        className="relative flex flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border border-line bg-surface-2 py-7"
        style={selectedColor ? { boxShadow: `inset 0 0 60px -20px ${selectedColor}` } : undefined}
      >
        <span className="label mb-2">{categoryId ? lookup.get(categoryId)?.name : "Amount"}</span>
        <span className="num flex items-baseline text-6xl font-semibold leading-none">
          <span className="mr-1 text-3xl text-muted">₹</span>
          {touch ? (
            <span className={clsx(!amount && "text-faint")}>
              {Number(rupees || 0).toLocaleString("en-IN")}
              {paise !== undefined && <span className="text-3xl text-muted">.{paise}</span>}
              <span className="ml-0.5 inline-block h-12 w-[3px] translate-y-1 animate-pulse rounded-full bg-accent-2 align-baseline" />
            </span>
          ) : (
            <input
              autoFocus={!editing}
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => AMOUNT_RE.test(e.target.value) && setAmount(e.target.value)}
              className="num min-w-[2ch] bg-transparent outline-none placeholder:text-faint"
              style={{ width: `${Math.max(amount.length, 1) + 0.4}ch` }}
              aria-label="Amount"
            />
          )}
        </span>
      </label>

      {/* Categories: one swipeable row on phones, a grid on larger screens */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {categories.map((c) => {
          const active = categoryId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={clsx(
                "flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2 text-[11px] font-medium transition active:scale-95 sm:w-auto",
                active ? "text-fg" : "border-transparent text-muted hover:bg-surface-2",
              )}
              style={active ? { borderColor: `${c.color}80`, background: `${c.color}1f`, boxShadow: `0 0 20px -6px ${c.color}` } : undefined}
            >
              <CategoryBadge icon={c.icon} color={c.color} size="sm" />
              <span className="w-full truncate text-center">{c.name}</span>
            </button>
          );
        })}
      </div>

      {touch && <Keypad onPress={press} />}

      <div>
        <button type="button" onClick={() => setDetails((d) => !d)} className="flex w-full items-center justify-between rounded-xl px-1 text-sm text-muted hover:text-fg">
          <span>
            More details
            <span className="ml-2 text-xs text-faint">
              {spentOn === today ? "Today" : spentOn} · {PAYMENT_LABELS[method]}
              {note && " · note"}
            </span>
          </span>
          <ChevronDown className={clsx("size-4 transition", details && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {details && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-4 pt-4">
                <div className="flex gap-2">
                  {[
                    { label: "Today", value: today },
                    { label: "Yesterday", value: iso(subDays(new Date(), 1)) },
                  ].map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setSpentOn(d.value)}
                      className={clsx(
                        "rounded-xl px-3.5 py-2 text-xs font-semibold transition",
                        spentOn === d.value ? "bg-accent-gradient text-white" : "border border-line bg-surface-2 text-muted hover:text-fg",
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
                    className={clsx(inputClass, "h-auto min-w-0 flex-1 py-2 sm:text-xs")}
                  />
                </div>
                <Segmented
                  value={method}
                  onChange={setMethod}
                  options={(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => ({
                    value: m,
                    label: m === "netbanking" ? "Bank" : PAYMENT_LABELS[m],
                  }))}
                />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="Note (optional)" className={inputClass} />
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ErrorNote error={save.error ?? remove.error} />

      <div className="flex gap-2">
        {editing && (
          <Button type="button" variant="danger" onClick={del} loading={remove.isPending} aria-label="Delete expense">
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button type="submit" className="h-14 flex-1 text-base" disabled={!valid} loading={save.isPending}>
          {!amount ? "Enter an amount" : categoryId === null ? "Pick a category" : editing ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

function Keypad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onPress(k)}
          className="num grid h-14 place-items-center rounded-2xl border border-line bg-surface-2 text-2xl font-medium transition active:scale-95 active:bg-surface-3"
          aria-label={k === "back" ? "Delete digit" : k}
        >
          {k === "back" ? <Delete className="size-6 text-muted" /> : k}
        </button>
      ))}
    </div>
  );
}
