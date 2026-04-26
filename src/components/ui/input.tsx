import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border bg-background px-4 text-sm",
        "placeholder:text-muted-foreground",
        "transition-smooth",
        "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background focus:border-primary",
        error
          ? "border-destructive focus:ring-destructive/40"
          : "border-input",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
