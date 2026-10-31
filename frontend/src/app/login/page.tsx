"use client";

import { Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button, ErrorNote, inputClass } from "@/components/ui/primitives";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    // Flex (not grid place-items-center): a grid column would size to the card's max width
    // and overflow narrow phones. Safe-area padding keeps content clear of the status bar.
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute -left-32 top-1/4 size-[28rem] rounded-full bg-accent/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 size-[28rem] rounded-full bg-accent-2/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-7 text-center">
          <Image
            src="/icon-192.png"
            alt=""
            width={72}
            height={72}
            priority
            className="mx-auto mb-5 rounded-[1.35rem] shadow-[0_16px_40px_-12px_rgb(0_0_0/0.6)]"
          />
          <h1 className="font-display text-4xl font-semibold tracking-tight">Kharchify</h1>
          <p className="mt-2 text-sm text-muted">
            Know where <span className="text-gradient font-semibold">every rupee</span> goes.
          </p>
        </div>

        <form onSubmit={submit} className="glass space-y-3 rounded-[2rem] p-5 sm:p-6">
          <input
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted hover:text-fg"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
          <ErrorNote error={error} />
          <Button type="submit" className="w-full" loading={busy}>
            Sign in
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
