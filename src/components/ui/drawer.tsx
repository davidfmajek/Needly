import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export const Drawer = ({ open, onClose, title, children, className }: DrawerProps) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="drawer-overlay"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 35 }}
            className={cn(
              "fixed right-0 top-0 z-[60] flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl sm:max-w-md md:max-w-lg",
              className,
            )}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-lg font-bold tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
