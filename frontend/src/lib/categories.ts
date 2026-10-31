"use client";

import { useMemo } from "react";
import { useCategories } from "./queries";
import type { Category } from "./types";

/** id → category (archived included), for colours of categories referenced by expenses/budgets. */
export function useCategoryLookup() {
  const { data } = useCategories(true);
  return useMemo(() => new Map<number, Category>((data ?? []).map((c) => [c.id, c])), [data]);
}

export const CATEGORY_COLORS = [
  "#F97316", "#22C55E", "#3B82F6", "#EC4899", "#EAB308",
  "#8B5CF6", "#06B6D4", "#EF4444", "#14B8A6", "#6B7280",
];
