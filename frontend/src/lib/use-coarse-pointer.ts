"use client";

import { useSyncExternalStore } from "react";

/** True on touch screens (phones/tablets). Used to avoid popping the keyboard or to show touch UI. */
export function useCoarsePointer() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}
