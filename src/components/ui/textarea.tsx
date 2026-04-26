import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm",
        "placeholder:text-muted-foreground",
        "transition-smooth resize-none",
        "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
