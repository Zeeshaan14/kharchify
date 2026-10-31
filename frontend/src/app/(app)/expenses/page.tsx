"use client";

import { clsx } from "clsx";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ReceiptText, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { ExpenseRow } from "@/components/expense-row";
import { Card, EmptyState, ErrorNote, inputClass, Segmented, Skeleton } from "@/components/ui/primitives";
import { dayLabel } from "@/lib/format";
import { type ExpenseFilters, useCategories, useExpensePages } from "@/lib/queries";
import type { Expense } from "@/lib/types";

type Range = "all" | "month" | "last";
const iso = (d: Date) => format(d, "yyyy-MM-dd");

function rangeFilter(range: Range): Pick<ExpenseFilters, "date_from" | "date_to"> {
  const now = new Date();
  if (range === "month") return { date_from: iso(startOfMonth(now)), date_to: iso(endOfMonth(now)) };
  if (range === "last") {
    const last = subMonths(now, 1);
    return { date_from: iso(startOfMonth(last)), date_to: iso(endOfMonth(last)) };
  }
  return {};
}

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const { data: categories = [] } = useCategories(true);

  // Debounce typing before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(() => ({ ...rangeFilter(range), category_id: categoryId, q: q || undefined }), [range, categoryId, q]);
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useExpensePages(filters);

  const total = data?.pages[0]?.total ?? 0;
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of data?.pages.flatMap((p) => p.items) ?? []) map.set(e.spent_on, [...(map.get(e.spent_on) ?? []), e]);
    return [...map.entries()];
  }, [data]);

  // Load the next page when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage(), {
      rootMargin: "300px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <PageHeader title="Expenses" subtitle={data ? `${total} ${total === 1 ? "expense" : "expenses"}` : " "} />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…" className={clsx(inputClass, "pl-10")} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-fg" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Segmented
            className="sm:w-80"
            value={range}
            onChange={setRange}
            options={[
              { value: "all", label: "All time" },
              { value: "month", label: "This month" },
              { value: "last", label: "Last month" },
            ]}
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={categoryId === undefined} onClick={() => setCategoryId(undefined)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)} color={c.color}>
              {c.icon} {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <ErrorNote error={error} />

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon={<ReceiptText className="size-5" />} title="No expenses found" hint="Try another filter, or tap + to add one." />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([day, list]) => (
            <section key={day}>
              <h3 className="mb-1.5 flex items-baseline justify-between px-1 text-xs font-medium text-muted">
                <span>{dayLabel(day, "EEEE, d MMM yyyy")}</span>
                <span>{list.length}</span>
              </h3>
              <Card className="p-2">
                {list.map((e) => (
                  <ExpenseRow key={e.id} expense={e} />
                ))}
              </Card>
            </section>
          ))}
          <div ref={sentinel} className="h-8" />
          {isFetchingNextPage && <Skeleton className="h-20 rounded-3xl" />}
        </div>
      )}
    </>
  );
}

function Chip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string | null; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition active:scale-95",
        active ? "border-transparent text-fg" : "border-line text-muted hover:text-fg",
      )}
      style={active ? { background: color ? `${color}33` : "var(--accent-soft)" } : undefined}
    >
      {children}
    </button>
  );
}
