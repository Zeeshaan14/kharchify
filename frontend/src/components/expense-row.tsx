"use client";

import { motion } from "motion/react";
import { useCategoryLookup } from "@/lib/categories";
import { dayLabel, inrFmt, PAYMENT_LABELS } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { useExpenseSheet } from "./expense-sheet";
import { CategoryBadge } from "./ui/primitives";

export function ExpenseRow({ expense, showDate = false }: { expense: Expense; showDate?: boolean }) {
  const { openEdit } = useExpenseSheet();
  const color = useCategoryLookup().get(expense.category.id)?.color;
  const meta = [showDate && dayLabel(expense.spent_on, "d MMM"), PAYMENT_LABELS[expense.payment_method], expense.note]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => openEdit(expense)}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-surface-2 active:scale-[0.99]"
    >
      <CategoryBadge icon={expense.category.icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{expense.category.name}</p>
        <p className="truncate text-xs text-muted">{meta}</p>
      </div>
      <div className="text-right">
        <p className="num text-sm font-semibold">−{inrFmt(expense.amount)}</p>
        {expense.is_need !== null && (
          <p className={`text-[10px] font-medium ${expense.is_need ? "text-good" : "text-warn"}`}>
            {expense.is_need ? "need" : "want"}
          </p>
        )}
      </div>
    </motion.button>
  );
}
