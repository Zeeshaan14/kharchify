"use client";

import { addMonths, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { monthLabel } from "@/lib/format";
import { IconButton } from "./ui/primitives";

export const currentMonth = () => format(new Date(), "yyyy-MM");
const shift = (month: string, by: number) => format(addMonths(parseISO(`${month}-01`), by), "yyyy-MM");

export function useMonth() {
  const [month, setMonth] = useState(currentMonth);
  return { month, setMonth, isCurrent: month === currentMonth() };
}

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const atLatest = month >= currentMonth();
  return (
    <div className="glass flex items-center gap-1 rounded-full p-1">
      <IconButton className="size-8" onClick={() => onChange(shift(month, -1))} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </IconButton>
      <button
        onClick={() => onChange(currentMonth())}
        className="font-display min-w-32 px-1 text-center text-sm font-semibold"
        title="Back to this month"
      >
        {monthLabel(month)}
      </button>
      <IconButton className="size-8" disabled={atLatest} onClick={() => onChange(shift(month, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </IconButton>
    </div>
  );
}
