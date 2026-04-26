import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Compass,
  Dumbbell,
  Hammer,
  MapPin,
  Moon,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleCell } from "@/lib/weeklyScheduleFromText";
import { useWeeklySchedule } from "@/hooks/useWeeklySchedule";
import {
  expandLongBlock,
  findFreeBlocks,
  formatBlockRange,
  formatHour,
  labelTitle,
  scheduleLabelToIntent,
  type FreeBlock,
} from "@/lib/scheduleHelpers";

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

const PRESET_LABELS = [
  "class", "work", "gym", "study", "sleep",
  "brunch", "lunch", "dinner", "commute", "nightlife",
  "practice", "volunteer", "date", "church",
];

function styleForCell(label: string | null) {
  if (!label) return null;
  return ACTIVITY_STYLE[label.toLowerCase()] ?? { tint: "from-primary/20 to-primary/10", label: labelTitle(label) };
}

type Suggestion = {
  title: string;
  reason: string;
  icon: typeof Coffee;
  intent: string;
  query: string;
};

const HOUR_BASED_SUGGESTIONS: { match: (hour: number) => boolean; build: () => Suggestion }[] = [
  { match: (h) => h >= 5 && h < 10,  build: () => ({ title: "Coffee run",     reason: "A pocket of free time — a quick latte fits perfectly.", icon: Sunrise,  intent: "coffee",   query: "coffee espresso" }) },
  { match: (h) => h >= 10 && h < 12, build: () => ({ title: "Quick errand",   reason: "Knock something off the list before lunch.",            icon: Coffee,   intent: "default",  query: "errand" }) },
  { match: (h) => h >= 12 && h < 14, build: () => ({ title: "Grab lunch",     reason: "Free midday block — try somewhere new.",                icon: Sun,      intent: "food",     query: "lunch" }) },
  { match: (h) => h >= 14 && h < 17, build: () => ({ title: "Study spot",     reason: "Quiet hours — find a good cafe with wifi.",             icon: Sparkles, intent: "study",    query: "library cafe" }) },
  { match: (h) => h >= 17 && h < 19, build: () => ({ title: "Hit the gym",    reason: "Open evening — squeeze in a workout.",                  icon: Dumbbell, intent: "gym",      query: "gym" }) },
  { match: (h) => h >= 19 && h < 21, build: () => ({ title: "Dinner plan",    reason: "Free evening — grab a bite somewhere good.",            icon: Sunset,   intent: "food",     query: "dinner" }) },
  { match: (h) => h >= 21 || h < 5,  build: () => ({ title: "Wind down",      reason: "Late, low-key spot to recharge.",                       icon: Moon,     intent: "chill",    query: "lounge" }) },
];

function suggestionForBlock(block: FreeBlock, row: ScheduleCell[]): Suggestion {
  const before = block.start > 0 ? row[block.start - 1]?.toLowerCase() ?? null : null;
  const after = block.end < 24 ? row[block.end]?.toLowerCase() ?? null : null;
  const mid = block.start + Math.floor((block.end - block.start) / 2);

  // Neighbor-aware overrides come first — they're often more useful than a
  // pure clock-based heuristic.
  if (before === "gym")
    return { title: "Refuel after the gym", reason: "Right after a workout — protein-friendly options nearby.", icon: Dumbbell, intent: "food", query: "smoothie protein bowl" };
  if (before === "class" && mid >= 11 && mid < 15)
    return { title: "Lunch after class", reason: "Class just ended — grab a quick bite.", icon: Sun, intent: "food", query: "lunch near campus" };
  if (after === "gym")
    return { title: "Pre-gym fuel", reason: "Quick energy before your workout.", icon: Coffee, intent: "coffee", query: "snack coffee" };
  if (after === "dinner")
    return { title: "Pre-dinner walk", reason: "Stretch your legs before dinner.", icon: Compass, intent: "outdoors", query: "park" };
  if (after === "class" || after === "work" || after === "study")
    return { title: "Coffee before " + after, reason: "Power up before you start.", icon: Coffee, intent: "coffee", query: "coffee" };
  if ((before === "work" || before === "class" || before === "study"))
    return { title: "Quick reset", reason: "Decompress with a short break.", icon: Coffee, intent: "coffee", query: "cafe" };
  if (after === "nightlife" || after === "date")
    return { title: "Dinner first", reason: "Set the night up with a great meal.", icon: Sunset, intent: "food", query: "dinner" };

  const fallback = HOUR_BASED_SUGGESTIONS.find((s) => s.match(mid)) ?? HOUR_BASED_SUGGESTIONS[HOUR_BASED_SUGGESTIONS.length - 1];
  return fallback.build();
}

/* ─── Tasks ─── */

type DayTask = {
  id: string;
  task_date: string;
  title: string;
  notes: string | null;
  start_hour: number | null;
  end_hour: number | null;
  supplies_query: string | null;
  completed: boolean;
};

type Rec = {
  id?: string;
  name: string;
  category: string;
  reason: string;
  distance: string;
  matchPct: number;
  openNow?: boolean;
  todayHours?: string | null;
  latitude?: number;
  longitude?: number;
};

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const SUPPLY_KEYWORDS = /\b(build|fix|repair|paint|assemble|install|sand|drill|hang|wood|nails?|screws?|tools?|hardware|lumber|tile)\b/i;

function inferSuppliesQuery(title: string): string | null {
  if (!SUPPLY_KEYWORDS.test(title)) return null;
  const t = title.toLowerCase();
  if (/\bchair|table|shelf|desk|frame|cabinet|deck|fence|bookcase\b/.test(t)) return "lumber wood nails screws hardware tools";
  if (/\bpaint\b/.test(t)) return "paint brushes rollers tape drop cloth";
  if (/\btile\b/.test(t)) return "tile grout adhesive trowel";
  if (/\bplant|garden|herb\b/.test(t)) return "garden center soil pots seeds";
  return "hardware store tools supplies";
}

/* ═══════════════════════════════════════════════════
   My Day
   ═══════════════════════════════════════════════════ */

const MyDay = () => {
  const { user } = useAuth();
  const { grid, scheduleText, loading, setCell } = useWeeklySchedule();

  const today = useMemo(() => new Date(), []);
  const [dayOffset, setDayOffset] = useState(0);
  const [editingHour, setEditingHour] = useState<number | null>(null);

  const viewDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset, today]);

  const dayIdx = viewDate.getDay();
  const isoDate = useMemo(() => toIsoDate(viewDate), [viewDate]);

  const row = useMemo<ScheduleCell[]>(
    () => grid?.cells[dayIdx] ?? Array<ScheduleCell>(24).fill(null),
    [grid, dayIdx],
  );
  const freeBlocks = useMemo(() => {
    const blocks = findFreeBlocks(row);
    return blocks.flatMap((b) => expandLongBlock(b));
  }, [row]);

  const isToday = dayOffset === 0;
  const dayLabel = isToday
    ? "Today"
    : dayOffset === 1
      ? "Tomorrow"
      : dayOffset === -1
        ? "Yesterday"
        : DAY_NAMES[dayIdx];
  const dateLabel = viewDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  /* ─── Tasks: load + mutate ─── */
  const [tasks, setTasks] = useState<DayTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setTasksLoading(true);
      const { data, error } = await supabase
        .from("user_day_tasks")
        .select("id, task_date, title, notes, start_hour, end_hour, supplies_query, completed")
        .eq("user_id", user.id)
        .eq("task_date", isoDate)
        .order("start_hour", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error && data) setTasks(data as DayTask[]);
      else setTasks([]);
      setTasksLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isoDate]);

  const addTask = async (input: { title: string; notes: string; startHour: number | null; endHour: number | null }) => {
    if (!user) return;
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) return;
    const supplies = inferSuppliesQuery(trimmedTitle);
    const payload = {
      user_id: user.id,
      task_date: isoDate,
      title: trimmedTitle,
      notes: input.notes.trim() || null,
      start_hour: input.startHour,
      end_hour: input.endHour,
      supplies_query: supplies,
    };
    const { data, error } = await supabase
      .from("user_day_tasks")
      .insert(payload)
      .select("id, task_date, title, notes, start_hour, end_hour, supplies_query, completed")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((prev) => [...prev, data as DayTask]);
    toast.success(supplies ? "Task added — we'll find supplies nearby" : "Task added");
    setShowAddTask(false);
  };

  const toggleTaskComplete = async (task: DayTask) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    await supabase
      .from("user_day_tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);
  };

  const deleteTask = async (task: DayTask) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await supabase.from("user_day_tasks").delete().eq("id", task.id);
  };

  /* ─── Timeline editing ─── */
  const handleHourSave = (hour: number, label: ScheduleCell) => {
    setCell(dayIdx, hour, label);
    setEditingHour(null);
  };

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
                  {freeBlocks.map((b, i) => (
                    <PocketCard key={`${b.start}-${b.end}-${i}`} block={b} row={row} index={i} />
                  ))}
                </div>
              </section>
            )}

            <TasksSection
              tasks={tasks}
              loading={tasksLoading}
              isToday={isToday}
              dayName={DAY_NAMES[dayIdx]}
              showAddTask={showAddTask}
              onShowAddTask={setShowAddTask}
              onAddTask={addTask}
              onToggleComplete={toggleTaskComplete}
              onDelete={deleteTask}
            />

            <section className="mt-10">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Timeline</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tap any hour to edit — your week stays in sync everywhere.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                {Array.from({ length: 24 }).map((_, h) => {
                  const cell = row[h];
                  const style = styleForCell(cell);
                  const isEditing = editingHour === h;
                  return (
                    <div key={h} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setEditingHour((e) => (e === h ? null : h))}
                        className="grid w-full grid-cols-[64px_1fr_auto] items-stretch text-left transition-colors hover:bg-accent/30"
                      >
                        <div className="border-r border-border bg-background/40 px-3 py-3 text-right text-xs text-muted-foreground">
                          {formatHour(h)}
                        </div>
                        <div className="relative px-4 py-2.5 text-sm">
                          {style ? (
                            <div className={`flex h-full items-center gap-2 rounded-lg bg-gradient-to-r ${style.tint} px-3 py-1.5`}>
                              <span className="text-sm font-medium">{style.label}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">Free</span>
                          )}
                        </div>
                        <div className="flex items-center pr-3 text-muted-foreground/60">
                          <Pencil className="h-3.5 w-3.5" />
                        </div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isEditing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden border-t border-border bg-background/40"
                          >
                            <HourEditor
                              hour={h}
                              initial={cell}
                              onSave={(label) => handleHourSave(h, label)}
                              onClose={() => setEditingHour(null)}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
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

/* ─── Pocket card with on-demand places-nearby fetch ─── */

const PocketCard = ({ block, row, index }: { block: FreeBlock; row: ScheduleCell[]; index: number }) => {
  const suggestion = suggestionForBlock(block, row);
  const Icon = suggestion.icon;
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Rec[] | null>(null);
  const [loading, setLoading] = useState(false);

  const findPlaces = async () => {
    setOpen(true);
    if (results) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("places-nearby", {
      body: { intent: suggestion.intent, query: suggestion.query, limit: 3 },
    });
    setLoading(false);
    if (error) {
      toast.error("Couldn't load nearby places.");
      setResults([]);
      return;
    }
    setResults(((data?.results ?? []) as Rec[]).slice(0, 3));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-glow"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{suggestion.title}</p>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {formatBlockRange(block)}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{suggestion.reason}</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 px-3 text-[11px]" onClick={findPlaces}>
            <MapPin className="mr-1.5 h-3 w-3" /> Find places
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {loading && <Skeleton className="h-16 w-full rounded-xl" />}
              {!loading && results && results.length === 0 && (
                <p className="rounded-xl border border-dashed border-border bg-background/40 p-3 text-xs text-muted-foreground">
                  No good options found right now.
                </p>
              )}
              {!loading && results?.map((r) => <PocketResultRow key={r.id ?? r.name} rec={r} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PocketResultRow = ({ rec }: { rec: Rec }) => (
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      rec.latitude != null && rec.longitude != null ? `${rec.latitude},${rec.longitude}` : rec.name,
    )}`}
    target="_blank"
    rel="noreferrer"
    className="block rounded-xl border border-border bg-background/50 p-3 text-xs transition-colors hover:bg-accent/40"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm font-medium">{rec.name}</span>
      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
        {rec.matchPct}% match
      </span>
    </div>
    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
      {rec.category} · {rec.distance}
    </p>
  </a>
);

/* ─── Tasks section ─── */

const TasksSection = ({
  tasks,
  loading,
  isToday,
  dayName,
  showAddTask,
  onShowAddTask,
  onAddTask,
  onToggleComplete,
  onDelete,
}: {
  tasks: DayTask[];
  loading: boolean;
  isToday: boolean;
  dayName: string;
  showAddTask: boolean;
  onShowAddTask: (open: boolean) => void;
  onAddTask: (input: { title: string; notes: string; startHour: number | null; endHour: number | null }) => Promise<void>;
  onToggleComplete: (task: DayTask) => void;
  onDelete: (task: DayTask) => void;
}) => {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{isToday ? "Today's tasks" : `${dayName} tasks`}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            One-time things you want to get done — Needly will surface supplies and spots when relevant.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onShowAddTask(!showAddTask)}>
          {showAddTask ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          {showAddTask ? "Cancel" : "Add task"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showAddTask && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <AddTaskForm onSubmit={onAddTask} onCancel={() => onShowAddTask(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 space-y-2">
        {loading && <Skeleton className="h-16 w-full rounded-2xl" />}
        {!loading && tasks.length === 0 && !showAddTask && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            <Briefcase className="mx-auto mb-2 h-5 w-5 text-muted-foreground/80" />
            Nothing on the list. Add a task — like "build a chair" — and we'll suggest where to grab supplies.
          </div>
        )}
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onToggleComplete={onToggleComplete} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
};

const AddTaskForm = ({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: { title: string; notes: string; startHour: number | null; endHour: number | null }) => Promise<void>;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [startHour, setStartHour] = useState<string>("");
  const [endHour, setEndHour] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit({
      title,
      notes,
      startHour: startHour === "" ? null : parseInt(startHour, 10),
      endHour: endHour === "" ? null : parseInt(endHour, 10),
    });
    setSubmitting(false);
    setTitle("");
    setNotes("");
    setStartHour("");
    setEndHour("");
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to get done?" />
      <Input
        className="mt-2"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={startHour}
          onChange={(e) => setStartHour(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm transition-smooth focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Anytime</option>
          {Array.from({ length: 24 }).map((_, h) => (
            <option key={h} value={h}>
              From {formatHour(h)}
            </option>
          ))}
        </select>
        <select
          value={endHour}
          onChange={(e) => setEndHour(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm transition-smooth focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">No end</option>
          {Array.from({ length: 24 }).map((_, h) => (
            <option key={h} value={h + 1}>
              Until {formatHour(h + 1)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} loading={submitting} disabled={!title.trim()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
};

const TaskRow = ({
  task,
  onToggleComplete,
  onDelete,
}: {
  task: DayTask;
  onToggleComplete: (task: DayTask) => void;
  onDelete: (task: DayTask) => void;
}) => {
  const [results, setResults] = useState<Rec[] | null>(null);
  const [loadingSupplies, setLoadingSupplies] = useState(false);
  const [open, setOpen] = useState(false);

  const findSupplies = async () => {
    setOpen(true);
    if (results) return;
    setLoadingSupplies(true);
    const { data, error } = await supabase.functions.invoke("places-nearby", {
      body: { intent: "supplies", query: task.supplies_query ?? task.title, limit: 3 },
    });
    setLoadingSupplies(false);
    if (error) {
      toast.error("Couldn't load supplies nearby.");
      setResults([]);
      return;
    }
    setResults(((data?.results ?? []) as Rec[]).slice(0, 3));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            task.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/60"
          }`}
        >
          {task.completed && <Check className="h-3 w-3" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}>
            {task.title}
          </p>
          {(task.start_hour != null || task.end_hour != null) && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {task.start_hour != null ? formatHour(task.start_hour) : "Anytime"}
              {task.end_hour != null ? ` – ${formatHour(task.end_hour)}` : ""}
            </p>
          )}
          {task.notes && <p className="mt-1 text-xs text-muted-foreground">{task.notes}</p>}
          {task.supplies_query && (
            <Button variant="outline" size="sm" className="mt-2 h-7 px-3 text-[11px]" onClick={findSupplies}>
              <Hammer className="mr-1.5 h-3 w-3" /> Find supplies
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="text-muted-foreground/60 hover:text-destructive"
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {loadingSupplies && <Skeleton className="h-16 w-full rounded-xl" />}
              {!loadingSupplies && results && results.length === 0 && (
                <p className="rounded-xl border border-dashed border-border bg-background/40 p-3 text-xs text-muted-foreground">
                  No supply spots found nearby.
                </p>
              )}
              {!loadingSupplies && results?.map((r) => <PocketResultRow key={r.id ?? r.name} rec={r} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Hour editor popover ─── */

const HourEditor = ({
  hour,
  initial,
  onSave,
  onClose,
}: {
  hour: number;
  initial: ScheduleCell;
  onSave: (label: ScheduleCell) => void;
  onClose: () => void;
}) => {
  const [value, setValue] = useState(initial ?? "");
  const intent = scheduleLabelToIntent(value);

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {formatHour(hour)} – {formatHour(hour + 1)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground/60 hover:text-foreground"
          aria-label="Close editor"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_LABELS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setValue(p)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-smooth ${
              value === p
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {labelTitle(p)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Or type something custom…"
          className="h-9 text-xs"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {intent ? <em>recommendations: {intent}</em> : <em>&nbsp;</em>}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onSave(null)}>
            <Wand2 className="mr-1.5 h-3 w-3" /> Free
          </Button>
          <Button size="sm" onClick={() => onSave(value.trim() || null)}>
            <Check className="mr-1.5 h-3 w-3" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Empty state ─── */

const EmptyState = ({ scheduleText }: { scheduleText: string }): ReactNode => (
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
