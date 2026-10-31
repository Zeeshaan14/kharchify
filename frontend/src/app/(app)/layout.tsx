"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import { ExpenseSheetProvider } from "@/components/expense-sheet";
import { getToken } from "@/lib/api";

const noSubscribe = () => () => {};

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  // The token is in localStorage, so it's only known in the browser (null while prerendering).
  const signedIn = useSyncExternalStore(noSubscribe, () => getToken() !== null, () => null);

  useEffect(() => {
    if (signedIn === false) router.replace("/login");
  }, [signedIn, router]);

  if (!signedIn) return null;
  return (
    <ExpenseSheetProvider>
      <AppShell>{children}</AppShell>
    </ExpenseSheetProvider>
  );
}
