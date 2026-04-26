import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, style: "relative" | "short" = "short") {
  const date = new Date(dateStr);
  if (style === "relative") return formatDistanceToNow(date, { addSuffix: true });
  return format(date, "MMM d, yyyy");
}
