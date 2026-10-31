"use client";

import { clsx } from "clsx";
import { CalendarDays, LayoutDashboard, LogOut, Moon, Plus, ReceiptText, Settings, Sun, Target } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
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
    <div className="mx-auto flex min-h-dvh max-w-[1400px]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 p-4 lg:block">
        <div className="glass flex h-full flex-col gap-1 rounded-[2rem] p-4">
          <Link href="/" className="mb-8 flex items-center gap-3 px-2 pt-2">
            <Image src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl shadow-[0_8px_20px_-8px_rgb(0_0_0/0.6)]" />
            <span className="font-display text-xl font-semibold tracking-tight">Kharchify</span>
          </Link>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition",
                isActive(href) ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {isActive(href) && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-2xl border border-line bg-surface-3 shadow-[inset_0_1px_0_var(--glass-highlight)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                >
                  <span className="bg-accent-gradient absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full shadow-[0_0_12px_var(--accent)]" />
                </motion.span>
              )}
              <Icon className={clsx("relative size-[18px]", isActive(href) && "text-accent-2")} />
              <span className="relative">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => openNew()}
            className="bg-accent-gradient glow mt-5 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="size-4" /> Add expense
          </button>
          <div className="mt-auto flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2 pl-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft font-display text-sm font-semibold text-accent">
              {me?.name?.[0]?.toUpperCase() ?? "·"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{me?.name ?? "…"}</p>
              <p className="truncate text-[11px] text-muted">{me?.email}</p>
            </div>
            <button onClick={toggle} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button onClick={logout} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg" aria-label="Log out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-36 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        {/* Page transition */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </main>

      {/* Phone: floating glass bar with a glowing add button */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="glass glass-blur relative mx-auto flex max-w-md items-center justify-between rounded-[1.75rem] px-2 py-2 !bg-[color-mix(in_oklab,var(--bg)_70%,transparent)]">
          {NAV.slice(0, 2).map((item) => (
            <BottomLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          <button
            onClick={() => openNew()}
            aria-label="Add expense"
            className="bg-accent-gradient glow -mt-9 grid size-[60px] place-items-center rounded-[1.4rem] text-white ring-[6px] ring-bg transition active:scale-90"
          >
            <Plus className="size-7" strokeWidth={2.5} />
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
    <Link href={href} className={clsx("relative flex w-16 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-medium transition", active ? "text-fg" : "text-faint")}>
      {active && (
        <motion.span layoutId="bottom-active" className="absolute inset-0 rounded-2xl bg-surface-3" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
      )}
      <Icon className={clsx("relative size-5", active && "text-accent-2 drop-shadow-[0_0_8px_var(--accent-2)]")} />
      <span className="relative">{label}</span>
    </Link>
  );
}

/** Page heading; on phones the settings link sits here since the bottom bar has no room. */
export function PageHeader({
  title,
  subtitle,
  action,
  inline = false,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Keep the action beside the title on phones too (saves a row on content-first pages). */
  inline?: boolean;
}) {
  const settingsLink = (className: string) => (
    <Link href="/settings" className={clsx("size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg", className)} aria-label="Settings">
      <Settings className="size-5" />
    </Link>
  );

  if (inline) {
    return (
      <header className="mb-4 flex items-center justify-between gap-2 sm:mb-6 sm:items-end">
        <div className="min-w-0">
          {subtitle && <p className="label mb-1.5 hidden sm:block">{subtitle}</p>}
          <h1 className="font-display truncate text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {settingsLink("grid lg:hidden")}
        </div>
      </header>
    );
  }

  return (
    // Phones: title row (with settings), action on its own row. Wider: one row.
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          {subtitle && <p className="label mb-1.5">{subtitle}</p>}
          <h1 className="font-display text-[1.7rem] font-semibold leading-tight tracking-tight sm:truncate sm:text-4xl">{title}</h1>
        </div>
        {settingsLink("grid sm:hidden")}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      {settingsLink("hidden sm:grid lg:hidden")}
    </header>
  );
}
