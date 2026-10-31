"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  ApiToken,
  ApiTokenCreated,
  Budget,
  BudgetPeriod,
  Category,
  DashboardSummary,
  Expense,
  ExpenseCreated,
  ExpenseInput,
  ExpensePage,
  User,
} from "./types";

const PAGE_SIZE = 30;

export type ExpenseFilters = {
  date_from?: string;
  date_to?: string;
  category_id?: number;
  q?: string;
};

// --- queries ---

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api<User>("/auth/me") });

export const useCategories = (includeArchived = false) =>
  useQuery({
    queryKey: ["categories", includeArchived],
    queryFn: () => api<Category[]>("/categories", { query: { include_archived: includeArchived } }),
  });

export const useDashboard = (month?: string) =>
  useQuery({
    queryKey: ["dashboard", month ?? "current"],
    queryFn: () => api<DashboardSummary>("/dashboard/summary", { query: { month } }),
    placeholderData: (previous) => previous,
  });

export const useBudgets = () => useQuery({ queryKey: ["budgets"], queryFn: () => api<Budget[]>("/budgets") });

export const useTokens = () => useQuery({ queryKey: ["tokens"], queryFn: () => api<ApiToken[]>("/tokens") });

export const useExpensePages = (filters: ExpenseFilters) =>
  useInfiniteQuery({
    queryKey: ["expenses", filters],
    queryFn: ({ pageParam }) =>
      api<ExpensePage>("/expenses", { query: { ...filters, limit: PAGE_SIZE, offset: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.limit : undefined),
  });

/** Every expense in a date range (the API caps pages at 100). */
export const useExpensesBetween = (dateFrom: string, dateTo: string) =>
  useQuery({
    queryKey: ["expenses", "range", dateFrom, dateTo],
    queryFn: async () => {
      const items: Expense[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await api<ExpensePage>("/expenses", {
          query: { date_from: dateFrom, date_to: dateTo, limit: 100, offset },
        });
        items.push(...page.items);
        if (items.length >= page.total || page.items.length === 0) return items;
      }
    },
    placeholderData: (previous) => previous,
  });

// --- mutations ---

/** Anything that changes spending refreshes every view that shows it. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ["expenses", "dashboard", "budgets"].map((key) => qc.invalidateQueries({ queryKey: [key] })),
    );
}

export function useSaveExpense() {
  const refresh = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: ExpenseInput }) =>
      id
        ? api<Expense>(`/expenses/${id}`, { method: "PATCH", body: data })
        : api<ExpenseCreated>("/expenses", { method: "POST", body: data }),
    onSuccess: refresh,
  });
}

export function useDeleteExpense() {
  const refresh = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
}

export function useSaveBudget() {
  const refresh = useInvalidateMoney();
  return useMutation({
    mutationFn: (input: { id?: number; period: BudgetPeriod; category_id: number | null; amount: string }) =>
      input.id
        ? api<Budget>(`/budgets/${input.id}`, { method: "PATCH", body: { amount: input.amount } })
        : api<Budget>("/budgets", { method: "POST", body: input }),
    onSuccess: refresh,
  });
}

export function useDeleteBudget() {
  const refresh = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/budgets/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<Omit<Category, "id">> }) =>
      id
        ? api<Category>(`/categories/${id}`, { method: "PATCH", body: data })
        : api<Category>("/categories", { method: "POST", body: data }),
    // Names/icons appear inside expenses, budgets and the dashboard too.
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCreateToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<ApiTokenCreated>("/tokens", { method: "POST", body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useRevokeToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/tokens/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}
