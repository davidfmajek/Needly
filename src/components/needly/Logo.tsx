import { Sparkles } from "lucide-react";

export const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  const icon = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const spark = size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${icon} flex items-center justify-center rounded-xl bg-gradient-hero shadow-soft animate-pulse-glow`}
      >
        <Sparkles className={`${spark} text-primary-foreground`} />
      </div>
      <span className={`${text} font-bold tracking-tight`}>Needly</span>
    </div>
  );
};