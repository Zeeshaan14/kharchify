"use client";

import { clsx } from "clsx";
import { CalendarDays, LayoutDashboard, LogOut, Moon, Plus, ReceiptText, Settings, Sun, Target } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useSyncExternalStore } from "react";
import { logout } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { useExpenseSheet } from "./expense-sheet";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Theme = "dark" | "light";

// The theme lives on <html data-theme>; every useTheme() re-renders when it changes.
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.getAttribute("data-theme") as Theme) ?? "dark",
    (): Theme => "dark",
  );
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };
  return { theme, toggle };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { openNew } = useExpenseSheet();
  const { theme, toggle } = useTheme();
  const { data: me } = useMe();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 p-5 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-3 pt-2">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-lg font-bold text-white shadow-[0_8px_24px_-6px_var(--accent)]">
            ₹
          </span>
          <span className="text-lg font-semibold tracking-tight">Kharchify</span>
        </Link>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
              isActive(href) ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {isActive(href) && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-2xl bg-surface-2"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <Icon className="relative size-[18px]" />
            <span className="relative">{label}</span>
          </Link>
        ))}
        <button
          onClick={() => openNew()}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-medium text-white shadow-[0_10px_30px_-10px_var(--accent)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <Plus className="size-4" /> Add expense
        </button>
        <div className="mt-auto flex items-center gap-2 rounded-2xl border border-line p-2 pl-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{me?.name ?? "…"}</p>
            <p className="truncate text-xs text-muted">{me?.email}</p>
          </div>
          <button onClick={toggle} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button onClick={logout} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg" aria-label="Log out">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Phone bottom bar + floating add */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="relative mx-auto flex max-w-md items-center justify-around rounded-[1.75rem] border border-line bg-surface/80 px-2 py-2 shadow-2xl backdrop-blur-xl">
          {NAV.slice(0, 2).map((item) => (
            <BottomLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          <button
            onClick={() => openNew()}
            aria-label="Add expense"
            className="-mt-8 grid size-14 place-items-center rounded-full bg-accent text-white shadow-[0_12px_30px_-6px_var(--accent)] ring-4 ring-bg transition active:scale-90"
          >
            <Plus className="size-6" />
          </button>
          {NAV.slice(2, 4).map((item) => (
            <BottomLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function BottomLink({ href, label, icon: Icon, active }: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link href={href} className={clsx("flex w-14 flex-col items-center gap-1 py-1 text-[10px] font-medium transition", active ? "text-fg" : "text-faint")}>
      <Icon className={clsx("size-5", active && "text-accent")} />
      {label}
    </Link>
  );
}

/** Page heading; on phones the settings link sits here since the bottom bar has no room. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    // Phones: title row (with settings), action on its own row. Wider: one row.
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          {subtitle && <p className="mb-1 text-sm text-muted">{subtitle}</p>}
          <h1 className="text-2xl font-semibold tracking-tight sm:truncate sm:text-3xl">{title}</h1>
        </div>
        <Link href="/settings" className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg sm:hidden" aria-label="Settings">
          <Settings className="size-5" />
        </Link>
      </div>
      {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      <Link href="/settings" className="hidden size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg sm:grid lg:hidden" aria-label="Settings">
        <Settings className="size-5" />
      </Link>
    </header>
  );
}
