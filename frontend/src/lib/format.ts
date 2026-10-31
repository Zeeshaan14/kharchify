import { format, parseISO } from "date-fns";
import type { Money } from "./types";

// Display only: the API does all money math; these just format its decimal strings.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** "₹1,23,456" — drops paise for whole rupees, like the backend's format_inr. */
export function inrFmt(value: Money | number, { whole = false } = {}): string {
  const n = Number(value);
  return whole || Number.isInteger(n) ? inrWhole.format(n) : inr.format(n);
}

/** "₹12.5K" for chart axes and calendar cells. */
export function inrCompact(value: Money | number): string {
  const n = Number(value);
  return n < 1000 ? `₹${Math.round(n)}` : `₹${compact.format(n)}`;
}

export const dayLabel = (iso: string, pattern = "EEE, d MMM") => format(parseISO(iso), pattern);
export const monthLabel = (month: string) => format(parseISO(`${month}-01`), "MMMM yyyy");

export const PAYMENT_LABELS = {
  upi: "UPI",
  cash: "Cash",
  card: "Card",
  netbanking: "Net banking",
  other: "Other",
} as const;
