"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./primitives";

const noSubscribe = () => () => {};

/**
 * Bottom sheet on phones, centred dialog on larger screens. Rendered into <body> via a portal:
 * glass cards (backdrop-filter) and page transitions (transform) would otherwise become the
 * containing block for position:fixed and trap the sheet inside them.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  const drag = useDragControls();
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-line bg-surface/95 p-5 backdrop-blur-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-[2rem]"
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          >
            {/* Drag the header to dismiss; the body stays scrollable. */}
            <div
              className="-mx-5 -mt-5 mb-4 flex touch-none flex-col px-5 pt-3"
              onPointerDown={(e) => drag.start(e)}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3 sm:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{title}</h2>
                <IconButton onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close">
                  <X className="size-5" />
                </IconButton>
              </div>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
