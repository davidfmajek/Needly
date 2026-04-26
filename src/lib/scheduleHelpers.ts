import type { ScheduleCell } from "./weeklyScheduleFromText";

export type FreeBlock = { start: number; end: number };

// Format an absolute hour in the day. 0 -> "12 AM", 12 -> "12 PM".
export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

// Format the *exclusive* end of an hour range so it never collapses to the
// same string as the start. An end of 24 reads "midnight" rather than
// "12 AM" (which would otherwise duplicate hour 0).
export function formatHourEnd(hour: number): string {
  if (hour >= 24) return "midnight";
  return formatHour(hour);
}

export function formatBlockRange(block: FreeBlock): string {
  if (block.start === 0 && block.end >= 24) return "All day";
  return `${formatHour(block.start)} – ${formatHourEnd(block.end)}`;
}

// Walk a 24-cell row and gather contiguous null spans. Returns half-open
// blocks `[start, end)` which is the convention everything else uses.
export function findFreeBlocks(row: ScheduleCell[]): FreeBlock[] {
  const blocks: FreeBlock[] = [];
  let start: number | null = null;
  for (let h = 0; h < 24; h++) {
    if (row[h] === null) {
      if (start === null) start = h;
    } else if (start !== null) {
      blocks.push({ start, end: h });
      start = null;
    }
  }
  if (start !== null) blocks.push({ start, end: 24 });
  // Trim noise: ignore blocks shorter than an hour, and skip windows that
  // only span the small hours (5 AM – 11 PM is the useful surface).
  return blocks.filter((b) => b.end - b.start >= 1 && b.end > 6 && b.start < 23);
}

// When the day is mostly empty (e.g. weekend with no schedule), a single
// 0-24 block produces one suggestion that doesn't help. Split very long
// blocks into the natural daily segments so the user gets a few staggered
// ideas instead of one vague one.
const DAY_SEGMENTS: FreeBlock[] = [
  { start: 6, end: 11 },
  { start: 11, end: 14 },
  { start: 14, end: 17 },
  { start: 17, end: 20 },
  { start: 20, end: 24 },
];

export function expandLongBlock(block: FreeBlock): FreeBlock[] {
  if (block.end - block.start <= 5) return [block];
  const segments = DAY_SEGMENTS
    .map((seg) => ({
      start: Math.max(block.start, seg.start),
      end: Math.min(block.end, seg.end),
    }))
    .filter((seg) => seg.end - seg.start >= 1);
  return segments.length > 0 ? segments : [block];
}

// Map a schedule-grid label (e.g. "class", "gym") to a Dashboard-style
// intent key understood by `places-nearby` and the result shortcuts.
export function scheduleLabelToIntent(label: string | null): string | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("class") || l.includes("study")) return "study";
  if (l.includes("gym") || l.includes("workout") || l.includes("fitness")) return "gym";
  if (l.includes("coffee")) return "coffee";
  if (l.includes("brunch") || l.includes("breakfast") || l.includes("lunch") || l.includes("dinner")) return "food";
  if (l.includes("party") || l.includes("nightlife") || l.includes("bar") || l.includes("club")) return "nightout";
  if (l.includes("walk") || l.includes("park") || l.includes("outdoor")) return "outdoors";
  if (l.includes("work") || l.includes("office") || l.includes("meeting")) return "coffee";
  return null;
}

// Pretty-print a label cell for the timeline.
export function labelTitle(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}
