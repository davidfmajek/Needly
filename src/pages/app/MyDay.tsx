import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarDays, ChevronLeft, ChevronRight, Coffee, Dumbbell, Moon, Sparkles, Sun, Sunrise, Sunset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isScheduleGrid, type ScheduleCell, type WeeklyScheduleGrid } from "@/lib/weeklyScheduleFromText";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ACTIVITY_STYLE: Record<string, { tint: string; label: string }> = {
  class:     { tint: "from-violet-400/30 to-purple-500/20",  label: "Class" },
  work:      { tint: "from-blue-400/30 to-indigo-500/20",    label: "Work" },
  gym:       { tint: "from-emerald-400/30 to-teal-500/20",   label: "Gym" },
  study:     { tint: "from-amber-400/30 to-orange-500/20",   label: "Study" },
  sleep:     { tint: "from-slate-400/30 to-slate-600/20",    label: "Sleep" },
  brunch:    { tint: "from-rose-400/30 to-pink-500/20",      label: "Brunch" },
  lunch:     { tint: "from-rose-400/30 to-pink-500/20",      label: "Lunch" },
  dinner:    { tint: "from-rose-400/30 to-pink-500/20",      label: "Dinner" },
  commute:   { tint: "from-cyan-400/30 to-sky-500/20",       label: "Commute" },
  nightlife: { tint: "from-fuchsia-400/30 to-purple-500/20", label: "Night out" },
  date:      { tint: "from-rose-400/30 to-pink-500/20",      label: "Date" },
  church:    { tint: "from-amber-400/30 to-yellow-500/20",   label: "Church" },
  practice:  { tint: "from-blue-400/30 to-cyan-500/20",      label: "Practice" },
  volunteer: { tint: "from-emerald-400/30 to-green-500/20",  label: "Volunteer" },
  busy:      { tint: "from-muted to-muted/60",               label: "Busy" },
};

const POCKET_SUGGESTIONS: { match: (hour: number) => boolean; icon: typeof Coffee; title: string; reason: string }[] = [
  { match: (h) => h >= 5 && h < 10,  icon: Sunrise, title: "Coffee run", reason: "A pocket of free time — a quick latte fits perfectly." },
  { match: (h) => h >= 10 && h < 12, icon: Coffee,  title: "Quick errand", reason: "Knock something off the list before lunch." },
  { match: (h) => h >= 12 && h < 14, icon: Sun,     title: "Grab lunch",  reason: "Free midday block — try somewhere new." },
  { match: (h) => h >= 14 && h < 17, icon: Sparkles,title: "Study spot",  reason: "Quiet hours — find a good cafe with wifi." },
  { match: (h) => h >= 17 && h < 19, icon: Dumbbell,title: "Hit the gym", reason: "Open evening — squeeze in a workout." },
  { match: (h) => h >= 19 && h < 21, icon: Sunset,  title: "Dinner plan", reason: "Free evening — grab a bite somewhere good." },
  { match: (h) => h >= 21 || h < 5,  icon: Moon,    title: "Wind down",   reason: "Late, low-key spot to recharge." },
];

type FreeBlock = { start: number; end: number };

function findFreeBlocks(row: ScheduleCell[]): FreeBlock[] {
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
  return blocks.filter((b) => b.end - b.start >= 1 && b.end > 6 && b.start < 23);
}

function suggestionForBlock(block: FreeBlock) {
  const mid = block.start + Math.floor((block.end - block.start) / 2);
  return POCKET_SUGGESTIONS.find((s) => s.match(mid)) ?? POCKET_SUGGESTIONS[POCKET_SUGGESTIONS.length - 1];
}

function formatHour(h: number): string {
  const hour = h % 24;
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

const MyDay = () => {
  const { user } = useAuth();
  const today = new Date();
  const [dayOffset, setDayOffset] = useState(0);
  const [grid, setGrid] = useState<WeeklyScheduleGrid | null>(null);
  const [scheduleText, setScheduleText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("weekly_schedule_grid, weekly_schedule_context")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.weekly_schedule_grid && isScheduleGrid(data.weekly_schedule_grid)) {
        setGrid(data.weekly_schedule_grid);
      }
      setScheduleText(data?.weekly_schedule_context ?? "");
      setLoading(false);
    })();
  }, [user]);

  const viewDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset, today]);

  const dayIdx = viewDate.getDay();
  const row = grid?.cells[dayIdx] ?? Array<ScheduleCell>(24).fill(null);
  const freeBlocks = useMemo(() => findFreeBlocks(row), [row]);

  const isToday = dayOffset === 0;
  const dayLabel = isToday
    ? "Today"
    : dayOffset === 1
      ? "Tomorrow"
      : dayOffset === -1
        ? "Yesterday"
        : DAY_NAMES[dayIdx];
  const dateLabel = viewDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Day</h1>
            <p className="mt-2 text-muted-foreground">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1 shadow-soft">
            <Button variant="ghost" size="icon" onClick={() => setDayOffset((o) => o - 1)} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">{dayLabel}</span>
            <Button variant="ghost" size="icon" onClick={() => setDayOffset((o) => o + 1)} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : !grid ? (
          <EmptyState scheduleText={scheduleText} />
        ) : (
          <>
            {freeBlocks.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold">Pockets of free time</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open windows in your {isToday ? "day" : DAY_NAMES[dayIdx].toLowerCase()} where Needly can slot in something good.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {freeBlocks.map((b, i) => {
                    const s = suggestionForBlock(b);
                    const Icon = s.icon;
                    return (
                      <motion.div
                        key={`${b.start}-${b.end}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -2 }}
                        className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-glow"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{s.title}</p>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {formatHour(b.start)} – {formatHour(b.end)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.reason}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="text-lg font-semibold">Timeline</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                {Array.from({ length: 24 }).map((_, h) => {
                  const cell = row[h];
                  const style = cell ? ACTIVITY_STYLE[cell] ?? ACTIVITY_STYLE.busy : null;
                  return (
                    <div
                      key={h}
                      className="grid grid-cols-[64px_1fr] items-stretch border-b border-border last:border-b-0"
                    >
                      <div className="border-r border-border bg-background/40 px-3 py-3 text-right text-xs text-muted-foreground">
                        {formatHour(h)}
                      </div>
                      <div className="relative px-4 py-2.5 text-sm">
                        {cell ? (
                          <div
                            className={`flex h-full items-center gap-2 rounded-lg bg-gradient-to-r ${style!.tint} px-3 py-1.5`}
                          >
                            <span className="text-sm font-medium">{style!.label}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">Free</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </motion.div>
    </AppShell>
  );
};

const EmptyState = ({ scheduleText }: { scheduleText: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="mt-12 rounded-3xl border border-dashed border-border bg-card p-12 text-center"
  >
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
      <CalendarDays className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="mt-5 text-lg font-semibold">No schedule yet</p>
    <p className="mt-1.5 text-sm text-muted-foreground">
      {scheduleText
        ? "We have your week in words but no parsed grid yet — try editing it from Settings."
        : "Tell Needly what your week looks like and we'll plan around it."}
    </p>
    <div className="mt-6">
      <Link to="/onboarding">
        <Button variant="outline">Set up my week</Button>
      </Link>
    </div>
  </motion.div>
);

export default MyDay;
