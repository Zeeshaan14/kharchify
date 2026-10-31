"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button, ErrorNote, inputClass } from "@/components/ui/primitives";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5">
      {/* Soft glow orbs */}
      <div className="pointer-events-none absolute -left-32 top-1/4 size-[28rem] rounded-full bg-accent/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 size-[28rem] rounded-full bg-accent-2/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <span className="bg-accent-gradient glow mx-auto mb-6 grid size-16 place-items-center rounded-[1.4rem] font-display text-3xl font-bold text-white">
            ₹
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Kharchify</h1>
          <p className="mt-2 text-sm text-muted">Know where <span className="text-gradient font-semibold">every rupee</span> goes.</p>
        </div>

        <form onSubmit={submit} className="glass space-y-3 rounded-[2rem] p-6">
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <ErrorNote error={error} />
          <Button type="submit" className="w-full" loading={busy}>
            Sign in
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
