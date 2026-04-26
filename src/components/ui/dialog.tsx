import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export const Dialog = ({ open, onOpenChange, children, className }: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => onOpenChange(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [onOpenChange]);

  // Close on backdrop click
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onOpenChange(false);
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      className="fixed inset-0 z-50 m-auto bg-transparent p-0 backdrop:bg-foreground/50 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative w-full max-w-md rounded-3xl border border-border bg-card p-0 shadow-glow",
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  );
};

export const DialogClose = ({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) => (
  <button
    onClick={onClose}
    className={cn(
      "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-smooth hover:text-foreground hover:bg-accent",
      className,
    )}
    aria-label="Close"
  >
    <X className="h-4 w-4" />
  </button>
);
