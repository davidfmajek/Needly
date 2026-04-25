import { Sparkles } from "lucide-react";

export const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero shadow-soft">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className={`${text} font-semibold tracking-tight`}>Needly</span>
    </div>
  );
};