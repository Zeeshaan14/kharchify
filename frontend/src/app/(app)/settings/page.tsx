"use client";

import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { Archive, ArchiveRestore, Check, Copy, KeyRound, LogOut, Moon, Plus, Smartphone, Sun, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { PageHeader, useTheme } from "@/components/app-shell";
import { Button, Card, CardTitle, CategoryBadge, ErrorNote, IconButton, inputClass, Segmented } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { logout } from "@/lib/api";
import { CATEGORY_COLORS } from "@/lib/categories";
import { useCategories, useCreateToken, useMe, useRevokeToken, useSaveCategory, useTokens } from "@/lib/queries";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
import type { Category } from "@/lib/types";

export default function SettingsPage() {
  const { data: me } = useMe();
  const { theme, toggle } = useTheme();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-xl font-semibold text-accent">
                {me?.name?.[0]?.toUpperCase() ?? "·"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{me?.name}</p>
                <p className="truncate text-sm text-muted">{me?.email}</p>
                <p className="text-xs text-faint">{me?.timezone}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Appearance</CardTitle>
            <Segmented
              value={theme}
              onChange={(t) => t !== theme && toggle()}
              options={[
                { value: "dark", label: (<span className="flex items-center justify-center gap-1.5"><Moon className="size-3.5" /> Dark</span>) },
                { value: "light", label: (<span className="flex items-center justify-center gap-1.5"><Sun className="size-3.5" /> Light</span>) },
              ]}
            />
          </Card>

          <TokensCard />

          <Button variant="soft" className="w-full" onClick={logout}>
            <LogOut className="size-4" /> Log out
          </Button>
        </div>

        <CategoriesCard />
      </div>
    </>
  );
}

function CategoriesCard() {
  const { data: categories = [] } = useCategories(true);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const active = categories.filter((c) => !c.is_archived);
  const archived = categories.filter((c) => c.is_archived);

  return (
    <Card className="self-start">
      <CardTitle
        action={
          <Button variant="soft" className="h-9 text-xs" onClick={() => setEditing("new")}>
            <Plus className="size-3.5" /> Add
          </Button>
        }
      >
        Categories
      </CardTitle>
      <div className="-mx-2">
        {active.map((c) => (
          <CategoryItem key={c.id} category={c} onClick={() => setEditing(c)} />
        ))}
      </div>
      {archived.length > 0 && (
        <>
          <p className="mb-1 mt-4 px-1 text-xs font-medium text-faint">Archived</p>
          <div className="-mx-2 opacity-60">
            {archived.map((c) => (
              <CategoryItem key={c.id} category={c} onClick={() => setEditing(c)} />
            ))}
          </div>
        </>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New category" : "Edit category"}>
        {editing && <CategoryForm key={editing === "new" ? "new" : editing.id} category={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </Card>
  );
}

function CategoryItem({ category, onClick }: { category: Category; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-2">
      <CategoryBadge icon={category.icon} color={category.color} size="sm" />
      <span className="flex-1 text-sm font-medium">{category.name}</span>
      <span className="text-xs text-faint">#{category.id}</span>
    </button>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const toast = useToast();
  const save = useSaveCategory();
  const touch = useCoarsePointer();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await save.mutateAsync({ id: category?.id, data: { name: name.trim(), icon: icon.trim() || null, color } });
    toast(category ? "Category updated" : "Category added");
    onDone();
  }

  async function toggleArchive() {
    await save.mutateAsync({ id: category!.id, data: { is_archived: !category!.is_archived } });
    toast(category!.is_archived ? "Category restored" : "Category archived");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <CategoryBadge icon={icon || null} color={color} size="lg" />
        <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={16} placeholder="🍕" className={clsx(inputClass, "w-20 text-center text-lg")} aria-label="Emoji" />
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required placeholder="Name" className={inputClass} autoFocus={!category && !touch} />
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={clsx("grid size-9 place-items-center rounded-full transition active:scale-90", color === c && "ring-2 ring-fg ring-offset-2 ring-offset-surface")}
            style={{ background: c }}
            aria-label={`Colour ${c}`}
          >
            {color === c && <Check className="size-4 text-white" />}
          </button>
        ))}
      </div>
      {category && (
        <p className="text-xs text-muted">
          ID <span className="font-mono text-fg">{category.id}</span> — use this in the iPhone Shortcut&apos;s Dictionary.
        </p>
      )}
      <ErrorNote error={save.error} />
      <div className="flex gap-2">
        {category && (
          <Button type="button" variant="soft" onClick={toggleArchive} loading={save.isPending && save.variables?.data.is_archived !== undefined}>
            {category.is_archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {category.is_archived ? "Restore" : "Archive"}
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={!name.trim()} loading={save.isPending && save.variables?.data.is_archived === undefined}>
          {category ? "Save" : "Add category"}
        </Button>
      </div>
    </form>
  );
}

function TokensCard() {
  const toast = useToast();
  const { data: tokens = [] } = useTokens();
  const create = useCreateToken();
  const revoke = useRevokeToken();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function add() {
    const created = await create.mutateAsync("iPhone Shortcut");
    setNewToken(created.token);
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(newToken!);
    setCopied(true);
  }

  return (
    <Card>
      <CardTitle
        action={
          <Button variant="soft" className="h-9 text-xs" onClick={add} loading={create.isPending}>
            <KeyRound className="size-3.5" /> New token
          </Button>
        }
      >
        iPhone Shortcut tokens
      </CardTitle>

      {newToken && (
        <div className="mb-3 rounded-2xl border border-good/30 bg-good/10 p-3">
          <p className="mb-2 text-xs text-good">Copy this now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs">{newToken}</code>
            <IconButton onClick={copy} aria-label="Copy token">
              {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
            </IconButton>
          </div>
        </div>
      )}

      <div className="-mx-2">
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <span className="grid size-8 place-items-center rounded-xl bg-surface-2 text-muted">
              <Smartphone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t.name} <span className="font-mono text-xs text-faint">{t.prefix}…</span>
              </p>
              <p className="text-xs text-muted">
                {t.last_used_at ? `Used ${formatDistanceToNow(new Date(t.last_used_at), { addSuffix: true })}` : "Never used"}
              </p>
            </div>
            {confirmId === t.id ? (
              <Button
                variant="danger"
                className="h-9 text-xs"
                loading={revoke.isPending}
                onClick={async () => {
                  await revoke.mutateAsync(t.id);
                  setConfirmId(null);
                  toast("Token revoked — Shortcuts using it will stop working");
                }}
              >
                Revoke?
              </Button>
            ) : (
              <IconButton onClick={() => setConfirmId(t.id)} aria-label="Revoke token" className="hover:text-bad">
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        ))}
        {!tokens.length && <p className="px-2 text-sm text-muted">No tokens yet.</p>}
      </div>
      <ErrorNote error={create.error ?? revoke.error} />
    </Card>
  );
}
