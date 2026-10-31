"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode, useId } from "react";
import { inrFmt } from "@/lib/format";
import type { BudgetStatus } from "@/lib/types";

export const STATUS_COLOR: Record<BudgetStatus, string> = {
  ok: "var(--good)",
  warning: "var(--warn)",
  over: "var(--bad)",
};

/** Frosted glass panel. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("glass rounded-[1.75rem] p-5", className)}>{children}</div>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="label">{children}</h2>
      {action}
    </div>
  );
}

/** "₹1,23,456.50" with a dim ₹ and smaller paise. */
export function Money({
  value,
  className,
  whole = false,
  sign,
  style,
}: {
  value: string | number;
  className?: string;
  whole?: boolean;
  sign?: "-" | "+";
  style?: CSSProperties;
}) {
  const text = inrFmt(Math.abs(Number(value)), { whole }).replace("₹", "");
  const [rupees, paise] = text.split(".");
  return (
    <span className={clsx("num whitespace-nowrap", className)} style={style}>
      {sign && <span className="opacity-60">{sign === "-" ? "−" : "+"}</span>}
      <span className="mr-[0.08em] text-[0.62em] font-medium opacity-50">₹</span>
      {rupees}
      {paise && <span className="text-[0.6em] opacity-50">.{paise}</span>}
    </span>
  );
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** One odometer wheel: a 0–9 column that rolls to `digit`. */
function Wheel({ digit, delay }: { digit: number; delay: number }) {
  const reduce = useReducedMotion();
  return (
    // An invisible copy of the digit sizes the wheel exactly like the static text around it.
    <span className="relative inline-block h-[1.1em] overflow-hidden leading-[1.1em]">
      <span className="invisible">{digit}</span>
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={{ y: reduce ? `${-digit * 10}%` : "0%" }}
        animate={{ y: `${-digit * 10}%` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 28, damping: 12, mass: 1.2, delay }}
      >
        {DIGITS.map((n) => (
          <span key={n} className="block h-[1.1em] text-center leading-[1.1em]">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * Money as an odometer: every digit rolls from 0 on first show, and from its old value whenever the
 * amount changes (e.g. after adding an expense). Paise stay static and small.
 */
export function RollingMoney({ value, whole = false, className }: { value: string | number; whole?: boolean; className?: string }) {
  const text = inrFmt(Math.abs(Number(value)), { whole }).replace("₹", "");
  const [rupees, paise] = text.split(".");
  const chars = rupees.split("");
  return (
    <span className={clsx("num inline-flex items-end whitespace-nowrap leading-[1.1]", className)} role="text" aria-label={`₹${text}`}>
      <span aria-hidden className="mr-[0.08em] mb-[0.18em] text-[0.55em] leading-none font-medium opacity-50">
        ₹
      </span>
      {chars.map((c, i) => {
        // Keyed from the right, so existing wheels keep rolling when the number gains a digit.
        const fromRight = chars.length - i;
        return /\d/.test(c) ? (
          <Wheel key={`d${fromRight}`} digit={Number(c)} delay={0.1 + (chars.length - fromRight) * 0.09} />
        ) : (
          <span key={`s${fromRight}`} aria-hidden className="inline-block h-[1.1em] leading-[1.1em]">
            {c}
          </span>
        );
      })}
      {paise && (
        <span aria-hidden className="mb-[0.16em] text-[0.6em] leading-none opacity-50">
          .{paise}
        </span>
      )}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "danger";
  loading?: boolean;
};

export function Button({ variant = "primary", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-accent-gradient glow text-white hover:brightness-110",
        variant === "soft" && "border border-line bg-surface-2 text-fg hover:bg-surface-3",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        variant === "danger" && "bg-bad/12 text-bad hover:bg-bad/20",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90 disabled:opacity-30",
        className,
      )}
    />
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-base text-fg outline-none sm:text-sm transition placeholder:text-faint focus:border-accent/60 focus:bg-surface-3 focus:shadow-[0_0_0_4px_var(--accent-soft)]";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-[1.75rem] bg-surface-2", className)} />;
}

/** Category emoji on a softly glowing tile. */
export function CategoryBadge({
  icon,
  color,
  size = "md",
}: {
  icon: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const c = color ?? "#8a8a9b";
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center",
        size === "sm" && "size-9 rounded-xl text-base",
        size === "md" && "size-11 rounded-2xl text-lg",
        size === "lg" && "size-14 rounded-2xl text-2xl",
      )}
      style={{
        background: `linear-gradient(145deg, ${c}38, ${c}12)`,
        boxShadow: `inset 0 1px 0 ${c}40, 0 6px 18px -8px ${c}90`,
      }}
    >
      {icon ?? "•"}
    </span>
  );
}

/** Budget bar in the brand gradient (status is shown in the surrounding text). */
export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={clsx("h-2 overflow-hidden rounded-full bg-surface-3", className)}>
      <motion.div
        className="h-full rounded-full"
        style={{
          background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
          boxShadow: "0 0 10px color-mix(in oklab, var(--accent) 45%, transparent)",
        }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(Math.min(percent, 100), 2)}%` }}
        transition={{ type: "spring", stiffness: 110, damping: 22 }}
      />
    </div>
  );
}

/** Glowing circular gauge in the brand gradient (violet → cyan). */
export function Ring({
  percent,
  size = 160,
  stroke = 12,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  // useId() contains colons, which break url(#…) references.
  const gid = `ring${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(percent, 100) / 100;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - filled) }}
          transition={{ type: "spring", stiffness: 50, damping: 18 }}
          style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--accent) 60%, transparent))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={clsx("flex rounded-2xl border border-line bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "relative flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition",
            value === o.value ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-xl bg-surface-3 shadow-[inset_0_1px_0_var(--glass-highlight)]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-muted">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="rounded-2xl border border-bad/25 bg-bad/10 px-4 py-3 text-sm text-bad">{(error as Error).message}</p>;
}
