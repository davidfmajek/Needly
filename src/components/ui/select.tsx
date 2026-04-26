import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: { value: string; label: string }[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, value, onValueChange, onChange, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        onChange={(e) => {
          onValueChange?.(e.target.value);
          onChange?.(e);
        }}
        className={cn(
          "flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-4 pr-10 text-sm",
          "transition-smooth",
          "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);

Select.displayName = "Select";
