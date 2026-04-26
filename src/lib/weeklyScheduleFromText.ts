// Parse a free-text description of someone's week into a 7x24 hourly grid.
//
// Cell is either `null` (free) or a short activity label (e.g. "class").
// Days are indexed Sunday=0..Saturday=6 to match `Date.prototype.getDay()`.
//
// The parser is intentionally forgiving — a few well-formed sentences should
// produce a useful grid even if not every fragment is understood.

export type ScheduleCell = string | null;
export type WeeklyScheduleGrid = {
  cells: ScheduleCell[][]; // 7 rows × 24 cols
  source: string;
  generatedAt: string;
};

const DAY_TOKENS: Record<string, number[]> = {
  sun: [0], sunday: [0], sundays: [0],
  mon: [1], monday: [1], mondays: [1],
  tue: [2], tues: [2], tuesday: [2], tuesdays: [2],
  wed: [3], weds: [3], wednesday: [3], wednesdays: [3],
  thu: [4], thur: [4], thurs: [4], thursday: [4], thursdays: [4],
  fri: [5], friday: [5], fridays: [5],
  sat: [6], saturday: [6], saturdays: [6],
  weekday: [1, 2, 3, 4, 5],
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
  weekends: [0, 6],
  daily: [0, 1, 2, 3, 4, 5, 6],
  everyday: [0, 1, 2, 3, 4, 5, 6],
};

const ACTIVITY_KEYWORDS: { match: RegExp; label: string }[] = [
  { match: /\b(class(es)?|lecture|school|college|university|seminar)\b/i, label: "class" },
  { match: /\b(work|office|job|shift|meeting)\b/i, label: "work" },
  { match: /\b(gym|workout|lift|run|cardio|yoga|pilates|fitness)\b/i, label: "gym" },
  { match: /\b(study|library|homework|hw|reading)\b/i, label: "study" },
  { match: /\b(sleep|bed|asleep)\b/i, label: "sleep" },
  { match: /\b(breakfast|brunch)\b/i, label: "brunch" },
  { match: /\b(lunch)\b/i, label: "lunch" },
  { match: /\b(dinner|supper)\b/i, label: "dinner" },
  { match: /\b(commute|drive|driving|train|bus)\b/i, label: "commute" },
  { match: /\b(party|club|bar|nightlife|drinks)\b/i, label: "nightlife" },
  { match: /\b(date)\b/i, label: "date" },
  { match: /\b(church|service|prayer|mass)\b/i, label: "church" },
  { match: /\b(practice|rehearsal|band|choir|team)\b/i, label: "practice" },
  { match: /\b(volunteer|tutor)\b/i, label: "volunteer" },
];

const PERIOD_RANGES: Record<string, [number, number]> = {
  morning:   [6, 11],
  mornings:  [6, 11],
  afternoon: [12, 16],
  afternoons:[12, 16],
  evening:   [17, 20],
  evenings:  [17, 20],
  night:     [21, 23],
  nights:    [21, 23],
  midday:    [11, 13],
  noon:      [12, 12],
  midnight:  [0, 0],
};

const emptyWeek = (): ScheduleCell[][] =>
  Array.from({ length: 7 }, () => Array<ScheduleCell>(24).fill(null));

// "9", "9am", "9:30", "9:30pm", "21:00"
function parseClock(raw: string, contextPm?: boolean): number | null {
  const m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase();
  if (hour < 0 || hour > 24 || minute > 59) return null;
  if (ampm === "am") {
    if (hour === 12) hour = 0;
  } else if (ampm === "pm") {
    if (hour < 12) hour += 12;
  } else if (contextPm && hour < 12) {
    hour += 12;
  }
  if (minute >= 30) hour += 1; // round up to nearest hour for the upper bound
  return Math.min(hour, 24);
}

function parseTimeRange(text: string): [number, number] | null {
  // "9-11am", "9am-3pm", "9:30 - 11:00", "from 9 to 11"
  const dash = text.match(
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|to|until|till)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
  );
  if (dash) {
    const right = dash[2].trim();
    const rightAmPm = /am|pm/i.test(right);
    const rightIsPm = /pm/i.test(right);
    // If only the right side has am/pm, infer for the left side too.
    const leftRaw = dash[1].trim();
    const left = parseClock(leftRaw, rightAmPm && rightIsPm);
    const r = parseClock(right);
    if (left !== null && r !== null && r > left) return [left, r];
    if (left !== null && r !== null && r === left) return [left, left + 1];
  }

  // Check named periods
  for (const [name, range] of Object.entries(PERIOD_RANGES)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
      return [range[0], range[1] + 1];
    }
  }

  // "at 9am" / "around 5"
  const single = text.match(/\b(?:at|around|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (single) {
    const start = parseClock(single[1].trim());
    if (start !== null) return [start, Math.min(start + 1, 24)];
  }

  // "all day", "most days"
  if (/\ball\s*day\b/i.test(text)) return [8, 18];
  return null;
}

function parseDays(text: string): number[] {
  const days = new Set<number>();
  // Ranges: "Mon-Wed", "Tue-Thu"
  const rangeRegex = /\b(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)\w*\s*(?:-|–|to|through|thru)\s*(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)\w*/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRegex.exec(text))) {
    const a = DAY_TOKENS[m[1].toLowerCase()]?.[0];
    const b = DAY_TOKENS[m[2].toLowerCase()]?.[0];
    if (a !== undefined && b !== undefined) {
      let cur = a;
      // Loop forward through the week, wrapping if needed.
      for (let i = 0; i < 7; i++) {
        days.add(cur);
        if (cur === b) break;
        cur = (cur + 1) % 7;
      }
    }
  }

  // Lists / individual mentions: "Mon, Wed and Fri", "Tue/Thu"
  const tokenRegex = /\b(sundays?|mondays?|tuesdays?|tues|wednesdays?|weds?|thursdays?|thurs?|fridays?|saturdays?|sun|mon|tue|wed|thu|fri|sat|weekdays?|weekends?|daily|everyday)\b/gi;
  while ((m = tokenRegex.exec(text))) {
    const indices = DAY_TOKENS[m[1].toLowerCase()];
    if (indices) for (const d of indices) days.add(d);
  }

  return [...days].sort((a, b) => a - b);
}

function findActivity(text: string): string | null {
  for (const { match, label } of ACTIVITY_KEYWORDS) {
    if (match.test(text)) return label;
  }
  return null;
}

// Split text into clauses on punctuation and common conjunctions so each clause
// can be parsed for one (days, time, activity) tuple.
function splitClauses(text: string): string[] {
  return text
    .split(/[.;\n]|(?:,?\s+(?:and|then|plus|also|while)\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function fillRange(grid: ScheduleCell[][], days: number[], start: number, end: number, label: string) {
  const lo = Math.max(0, Math.min(start, 24));
  const hi = Math.max(0, Math.min(end, 24));
  for (const d of days) {
    if (d < 0 || d > 6) continue;
    for (let h = lo; h < hi; h++) {
      // Don't overwrite an existing activity unless the cell is free.
      if (grid[d][h] === null) grid[d][h] = label;
    }
  }
}

export function hourlyGridFromText(input: string): WeeklyScheduleGrid {
  const cells = emptyWeek();
  const text = (input || "").trim();
  if (!text) return { cells, source: input ?? "", generatedAt: new Date().toISOString() };

  for (const clause of splitClauses(text)) {
    const days = parseDays(clause);
    if (days.length === 0) continue;
    const range = parseTimeRange(clause);
    const activity = findActivity(clause) ?? "busy";

    if (range) {
      fillRange(cells, days, range[0], range[1], activity);
    } else {
      // No specific time mentioned — assume the activity loosely covers the
      // mid-day block so we still convey "this person tends to be busy then".
      fillRange(cells, days, 9, 17, activity);
    }
  }

  return { cells, source: text, generatedAt: new Date().toISOString() };
}

export function isScheduleGrid(value: unknown): value is WeeklyScheduleGrid {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<WeeklyScheduleGrid>;
  return (
    Array.isArray(v.cells) &&
    v.cells.length === 7 &&
    v.cells.every((row) => Array.isArray(row) && row.length === 24)
  );
}
