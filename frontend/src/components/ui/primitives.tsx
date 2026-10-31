"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { type ButtonHTMLAttributes, type ReactNode, useEffect } from "react";
import { inrFmt } from "@/lib/format";
import type { BudgetStatus } from "@/lib/types";

export const STATUS_COLOR: Record<BudgetStatus, string> = {
  ok: "var(--good)",
  warning: "var(--warn)",
  over: "var(--bad)",
};

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_0_rgb(255_255_255/0.03)_inset]", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-medium text-muted">{children}</h2>
      {action}
    </div>
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-accent text-white shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110",
        variant === "soft" && "bg-surface-2 text-fg hover:bg-surface-3",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        variant === "danger" && "bg-bad/10 text-bad hover:bg-bad/20",
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
        "grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg active:scale-95 disabled:opacity-30",
        className,
      )}
    />
  );
}

export const inputClass =
  "h-11 w-full rounded-2xl border border-line bg-surface-2 px-4 text-sm text-fg outline-none transition placeholder:text-faint focus:border-accent focus:bg-surface";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-2xl bg-surface-2", className)} />;
}

/** Category emoji on a tinted circle. */
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
        "grid shrink-0 place-items-center rounded-2xl",
        size === "sm" && "size-8 text-base",
        size === "md" && "size-10 text-lg",
        size === "lg" && "size-12 text-xl",
      )}
      style={{ background: `${c}22`, boxShadow: `inset 0 0 0 1px ${c}33` }}
    >
      {icon ?? "•"}
    </span>
  );
}

/** Horizontal budget bar; turns amber/red with status. */
export function ProgressBar({ percent, status, className }: { percent: number; status: BudgetStatus; className?: string }) {
  return (
    <div className={clsx("h-2 overflow-hidden rounded-full bg-surface-3", className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: STATUS_COLOR[status] }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percent, 100)}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

/** Circular progress ring. */
export function Ring({
  percent,
  color,
  size = 148,
  stroke = 12,
  children,
}: {
  percent: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(percent, 100) / 100;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - filled) }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Money that counts up to its value. */
export function AnimatedMoney({ value, className }: { value: string | number; className?: string }) {
  const target = Number(value);
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => inrFmt(Math.round(v * 100) / 100));
  useEffect(() => {
    const controls = animate(mv, target, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, target]);
  return <motion.span className={clsx("num", className)}>{text}</motion.span>;
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
  return (
    <div className={clsx("flex rounded-2xl bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "relative flex-1 rounded-xl px-3 py-2 text-xs font-medium transition",
            value === o.value ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.value).join("")}`}
              className="absolute inset-0 rounded-xl bg-surface-3 shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
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
      <div className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{(error as Error).message}</p>;
}
