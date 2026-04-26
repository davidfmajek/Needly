import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { Bookmark, Heart, MapPin, Sparkles, Search, ArrowRight, Clock, Coffee, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/* ─── Types ─── */
type Rec = { name: string; category: string; reason: string; distance: string; matchPct: number };
type SavedPlace = { id: string; place_name: string; category: string | null };

/* ─── Deterministic gradient + emoji from a category/name pair ─── */
const CARD_GRADIENTS = [
  "from-emerald-400/30 to-teal-500/20",
  "from-blue-400/30 to-indigo-500/20",
  "from-violet-400/30 to-purple-500/20",
  "from-amber-400/30 to-orange-500/20",
  "from-rose-400/30 to-pink-500/20",
  "from-cyan-400/30 to-sky-500/20",
];

function categoryEmoji(category: string | null, name: string): string {
  const c = (category ?? "").toLowerCase();
  const n = name.toLowerCase();
  if (c.includes("coffee") || c.includes("café") || c.includes("cafe")) return "☕";
  if (c.includes("food") || c.includes("ramen") || c.includes("mexican") || c.includes("asian") || c.includes("brunch")) return "🍜";
  if (c.includes("gym") || c.includes("fitness")) return "🏋️";
  if (c.includes("library") || c.includes("study") || c.includes("coworking")) return "📚";
  if (c.includes("bar") || c.includes("cocktail") || c.includes("music") || c.includes("entertainment")) return "🎶";
  if (c.includes("park") || c.includes("outdoor") || c.includes("trail") || c.includes("garden")) return "🌳";
  if (n.includes("café") || n.includes("cafe")) return "☕";
  return "📍";
}

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

/* ─── Context-aware mock results keyed by pill category ─── */
const RESULTS_MAP: Record<string, Rec[]> = {
  coffee: [
    { name: "Bluestone Café", category: "Coffee · Study spot", reason: "Quiet, fast wifi, oat milk available.", distance: "4 min walk", matchPct: 97 },
    { name: "Roast Republic", category: "Coffee · Cozy", reason: "Top-rated espresso, open late.", distance: "6 min walk", matchPct: 93 },
    { name: "Third Wave Brew", category: "Specialty Coffee", reason: "Pour-over perfection, minimal crowd.", distance: "9 min walk", matchPct: 88 },
  ],
  food: [
    { name: "Greenleaf Bowls", category: "Healthy food", reason: "Matches your dietary prefs and budget.", distance: "7 min walk", matchPct: 95 },
    { name: "Taco Libre", category: "Mexican · Quick", reason: "Fast, affordable, open late.", distance: "5 min walk", matchPct: 91 },
    { name: "Noodle House", category: "Asian · Ramen", reason: "Perfect comfort food for tonight.", distance: "8 min walk", matchPct: 87 },
  ],
  study: [
    { name: "Bluestone Café", category: "Coffee · Study spot", reason: "Quiet corners, fast wifi, power outlets.", distance: "4 min walk", matchPct: 96 },
    { name: "Central Library", category: "Library · Study", reason: "Silent zone, open until midnight.", distance: "10 min walk", matchPct: 92 },
    { name: "The Study Nook", category: "Coworking · Quiet", reason: "Free for students, great lighting.", distance: "12 min walk", matchPct: 85 },
  ],
  gym: [
    { name: "North End Gym", category: "Fitness · 24/7", reason: "Open late, fits your weekly routine.", distance: "12 min walk", matchPct: 94 },
    { name: "Iron Works", category: "Gym · Strength", reason: "Free weights, low crowd evenings.", distance: "8 min walk", matchPct: 90 },
    { name: "FitZone", category: "Fitness · Classes", reason: "Group classes included, good energy.", distance: "15 min walk", matchPct: 86 },
  ],
  nightout: [
    { name: "The Rooftop", category: "Bar · Cocktails", reason: "Great views, DJ on weekends.", distance: "10 min walk", matchPct: 93 },
    { name: "Vinyl Lounge", category: "Music · Bar", reason: "Live jazz tonight, chill vibe.", distance: "7 min walk", matchPct: 89 },
    { name: "Arcade Bar", category: "Entertainment", reason: "Retro games, craft beer, fun crowd.", distance: "14 min walk", matchPct: 85 },
  ],
  outdoors: [
    { name: "Riverside Park", category: "Outdoors · Walk", reason: "Great for a quick reset between sessions.", distance: "9 min walk", matchPct: 94 },
    { name: "Sunset Trail", category: "Outdoors · Hike", reason: "Short loop, beautiful this time of year.", distance: "15 min drive", matchPct: 88 },
    { name: "City Gardens", category: "Park · Relax", reason: "Quiet, benches, nice shade.", distance: "6 min walk", matchPct: 86 },
  ],
  chill: [
    { name: "Vinyl Lounge", category: "Music · Chill", reason: "Low-key vibe, great for winding down.", distance: "7 min walk", matchPct: 92 },
    { name: "Moonlight Café", category: "Café · Late night", reason: "Cozy, warm drinks, open late.", distance: "5 min walk", matchPct: 90 },
    { name: "Riverside Park", category: "Outdoors · Night", reason: "Peaceful night walk spot.", distance: "9 min walk", matchPct: 84 },
  ],
  default: [
    { name: "Greenleaf Bowls", category: "Healthy food", reason: "Matches your dietary prefs.", distance: "7 min walk", matchPct: 93 },
    { name: "Bluestone Café", category: "Coffee · Study spot", reason: "Great vibes, fast wifi.", distance: "4 min walk", matchPct: 91 },
    { name: "Riverside Park", category: "Outdoors", reason: "Perfect for a reset.", distance: "9 min walk", matchPct: 87 },
  ],
};

/* ─── Pill → result category mapping ─── */
function getResultKey(pill: string): string {
  const p = pill.toLowerCase();
  if (p.includes("coffee") || p.includes("brew")) return "coffee";
  if (p.includes("lunch") || p.includes("dinner") || p.includes("breakfast") || p.includes("bite") || p.includes("food") || p.includes("errand")) return "food";
  if (p.includes("study") || p.includes("class")) return "study";
  if (p.includes("gym") || p.includes("fitness")) return "gym";
  if (p.includes("night out") || p.includes("nightlife")) return "nightout";
  if (p.includes("walk") || p.includes("outside") || p.includes("park") || p.includes("outdoors")) return "outdoors";
  if (p.includes("chill") || p.includes("recharge") || p.includes("wind") || p.includes("surprise")) return "chill";
  return "default";
}

/* ─── Time- and day-aware pills ─── */
function getTimePills(hour: number, dayIndex: number, interests: string[]): string[] {
  const isWeekend = dayIndex === 0 || dayIndex === 6;
  const isLateWeekend = (dayIndex === 5 && hour >= 17) || dayIndex === 6 || (dayIndex === 0 && hour < 5);

  let base: string[];
  if (isLateWeekend && (hour >= 21 || hour < 5)) {
    base = ["Late night bite", "Night out", "Weekend chill"];
  } else if (isLateWeekend && hour >= 17) {
    base = ["Dinner plans", "Night out", "Weekend chill"];
  } else if (isWeekend && hour >= 12 && hour < 17) {
    base = ["Weekend brunch", "Go for a walk", "Coffee run"];
  } else if (isWeekend && hour >= 5 && hour < 12) {
    base = ["Weekend brunch", "Coffee run", "Go for a walk"];
  } else if (hour >= 5 && hour < 12) {
    base = ["Grab breakfast", "Coffee run", "Head to class"];
  } else if (hour >= 12 && hour < 17) {
    base = ["Find lunch", "Study spot", "Quick errand"];
  } else if (hour >= 17 && hour < 21) {
    base = ["Dinner plans", "Hit the gym", "Wind down"];
  } else {
    base = ["Late night bite", "Night out", "Something chill"];
  }

  // Blend in user interests, but skip ones that clash with the current vibe.
  const isLateNight = hour >= 21 || hour < 5;
  const INTEREST_MAP: Record<string, string | null> = {
    Gym: isLateNight ? null : hour >= 17 ? "Hit the gym" : "Gym session",
    Coffee: isLateNight ? null : "Coffee run",
    Nightlife: hour >= 17 ? "Night out" : null,
    Outdoors: hour < 21 ? "Go for a walk" : null,
    Art: hour < 21 ? "Visit a gallery" : null,
    Music: "Find live music",
    Shopping: hour >= 9 && hour < 21 ? "Quick errand" : null,
  };

  const extras = interests
    .map((i) => INTEREST_MAP[i])
    .filter((x): x is string => !!x && !base.includes(x));
  const merged = [...base, ...extras.slice(0, 2)];
  return [...new Set(merged)].slice(0, 6);
}

/* ─── Dynamic subheader based on day + hour ─── */
function getSubheader(hour: number, dayIndex: number): string {
  const isWeekend = dayIndex === 0 || dayIndex === 6;
  if (hour >= 21 || hour < 5) return isWeekend ? "Weekend night picks for tonight." : "Wind-down picks for tonight.";
  if (hour >= 17) return isWeekend ? "Saturday evening — pick your vibe." : "Evening picks for after work.";
  if (hour >= 12) return isWeekend ? "Weekend afternoon picks nearby." : "Afternoon picks based on your routine.";
  if (hour >= 5) return isWeekend ? "Slow weekend morning picks." : "Start your day with these picks.";
  return "Late night picks nearby.";
}

/* ─── Rotating placeholder ─── */
const PLACEHOLDERS = ["Where to next?", "Describe what you need...", "What are you in the mood for?", "Find something nearby..."];

function useRotatingPlaceholder() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);
  return PLACEHOLDERS[idx];
}

/* ─── Vibe strength data ─── */
const VIBE_MAP: Record<string, { emoji: string; label: string }> = {
  Coffee: { emoji: "☕", label: "Coffee Shops" },
  Gym: { emoji: "🏋️", label: "Fitness" },
  School: { emoji: "📚", label: "Study Spots" },
  Nightlife: { emoji: "🌙", label: "Nightlife" },
  Outdoors: { emoji: "🌳", label: "Outdoors" },
  Shopping: { emoji: "🛍️", label: "Shopping" },
  Art: { emoji: "🎨", label: "Art & Culture" },
  Music: { emoji: "🎵", label: "Live Music" },
  "Sporting Events": { emoji: "⚽", label: "Sports" },
};

/* ─── Top pick ─── */
const TOP_PICK = {
  name: "Bluestone Café",
  category: "Coffee · Study spot",
  reason: "Quiet, fast wifi, oat milk available — fits your vibe perfectly.",
  distance: "4 min walk",
  matchPct: 97,
};

const FALLBACK = ["Quiet spot to recharge", "Surprise me", "Something new nearby"];
const ease = [0.22, 1, 0.36, 1] as const;

/* ═══════════════════════════════════════════════════
   Dashboard Component
   ═══════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [showPopup, setShowPopup] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("needly_top_pick_dismissed") !== "1",
  );
  const dismissTopPick = () => {
    try { sessionStorage.setItem("needly_top_pick_dismissed", "1"); } catch { /* sessionStorage unavailable */ }
    setShowPopup(false);
  };
  const [favorited, setFavorited] = useState(false);
  const [selectedNext, setSelectedNext] = useState<string | null>(null);
  const [lastWasSearch, setLastWasSearch] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [results, setResults] = useState<Rec[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [savedSpots, setSavedSpots] = useState<SavedPlace[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const placeholder = useRotatingPlaceholder();
  const now = new Date();
  const hour = now.getHours();
  const dayIndex = now.getDay();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const timePeriod = hour >= 5 && hour < 12 ? "Morning" : hour >= 12 && hour < 17 ? "Afternoon" : hour >= 17 && hour < 21 ? "Evening" : "Night";
  const vibeEmoji = hour >= 21 || hour < 5 ? "🌙" : hour >= 17 ? "🌆" : hour >= 12 ? "☀️" : "🌅";
  const subheader = getSubheader(hour, dayIndex);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("interests, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.interests) setInterests(data.interests as string[]);
      if (data?.display_name) setDisplayName(data.display_name);
    })();
  }, [user]);

  // Load saved spots for carousel
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("saved_places").select("id, place_name, category").order("created_at", { ascending: false }).limit(10);
      if (data) setSavedSpots(data);
    })();
  }, [user]);

  const savePlace = async (r: Rec) => {
    if (!user) return;
    const { error } = await supabase.from("saved_places").insert({ user_id: user.id, place_name: r.name, category: r.category, reason: r.reason });
    if (error) toast.error(error.message);
    else {
      toast.success(`Saved ${r.name}`);
      setSavedSpots((prev) => [{ id: Date.now().toString(), place_name: r.name, category: r.category }, ...prev].slice(0, 10));
    }
  };

  const favoriteTopPick = async () => {
    if (favorited) return;
    setFavorited(true);
    await savePlace(TOP_PICK);
  };

  const timePills = getTimePills(hour, dayIndex, interests);

  const onPickNext = (option: string, fromSearch = false) => {
    setSelectedNext(option);
    setLastWasSearch(fromSearch);
    setResults(null);
    setLoadingResults(true);
    const key = getResultKey(option);
    setTimeout(() => { setResults(RESULTS_MAP[key] || RESULTS_MAP.default); setLoadingResults(false); }, 600);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    onPickNext(q, true);
    setSearchValue("");
  };

  // Open/Closed badge based on hour
  const isOpenNow = hour >= 7 && hour < 23;

  return (
    <AppShell>
      {/* ── Recommendation popup ── */}
      <Dialog open={showPopup} onOpenChange={(o) => (o ? setShowPopup(true) : dismissTopPick())}>
        <div className="relative p-7">
          <DialogClose onClose={dismissTopPick} />
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Top pick for you
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            ✨ AI Match: {TOP_PICK.matchPct}%
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">{TOP_PICK.name}</h2>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {TOP_PICK.category} · {TOP_PICK.distance}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">{TOP_PICK.reason}</p>
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={favoriteTopPick} className="flex-1">
              <Heart className={`mr-2 h-4 w-4 ${favorited ? "fill-current" : ""}`} />
              {favorited ? "Saved" : "Favorite"}
            </Button>
            <Button variant="outline" onClick={dismissTopPick}>See what's next</Button>
          </div>
        </div>
      </Dialog>

      {/* ── Main content ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* Context bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>📍 Calverton, MD</span>
          <span className="text-border">•</span>
          <span>{vibeEmoji} {dayName} {timePeriod} Vibe</span>
        </div>

        {/* Greeting */}
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}{displayName ? `, ${displayName}` : ""} <span className="animate-fade-in">👋</span>
        </h1>
        <p className="mt-1 text-muted-foreground">{subheader}</p>

        {/* Search bar */}
        <form onSubmit={onSearch} className="mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-14 text-sm shadow-soft placeholder:text-muted-foreground/60 transition-smooth focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft transition-smooth hover:opacity-90"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Time-aware pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {timePills.map((opt) => (
            <motion.button key={opt} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => onPickNext(opt)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                selectedNext === opt ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card hover:border-primary/40"
              }`}
            >{opt}</motion.button>
          ))}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => setShowFallback((s) => !s)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              showFallback ? "border-primary bg-accent" : "border-dashed border-border bg-transparent hover:border-primary/40"
            }`}
          >None of these</motion.button>
        </div>

        <AnimatePresence>
          {showFallback && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex flex-wrap gap-2">
              {FALLBACK.map((opt) => (
                <motion.button key={opt} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => onPickNext(opt)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    selectedNext === opt ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card hover:border-primary/40"
                  }`}
                >{opt}</motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Skeleton loading ── */}
      {loadingResults && (
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* ── Result cards with AI match ── */}
      <AnimatePresence mode="wait">
        {results && (
          <motion.div key={selectedNext} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-10">
            <h2 className="text-lg font-semibold">Recommended for "{selectedNext}"</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {results.map((r, i) => (
                <motion.div key={r.name} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.12, ease }}
                  whileHover={{ y: -4 }}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-glow"
                >
                  {/* AI match badge */}
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary animate-pulse-glow" style={{ animationDuration: "4s" }}>
                      ✨ AI Match: {r.matchPct}%
                    </span>
                    {lastWasSearch && selectedNext && (
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground">
                        ✨ Tailored to: {selectedNext}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary"><MapPin className="h-3.5 w-3.5" /> {r.category}</div>
                  <h3 className="mt-2 text-lg font-semibold">{r.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{r.distance}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{r.reason}</p>
                  <Button variant="outline" size="sm" onClick={() => savePlace(r)} className="mt-4">
                    <Bookmark className="mr-2 h-4 w-4" /> Save
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Saved Spots Carousel ── */}
      <section className="mt-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Saved Spots</h2>
          {savedSpots.length > 0 && (
            <a href="/saved" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ChevronRight className="h-3 w-3" />
            </a>
          )}
        </div>
        {savedSpots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Bookmark className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No saved spots yet. Save recommendations above!</p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {savedSpots.map((s, i) => {
              const grad = gradientFor(s.id || s.place_name);
              const emoji = categoryEmoji(s.category, s.place_name);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -3 }}
                  className="flex-shrink-0 snap-start w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-glow transition-shadow"
                >
                  <div className={`relative h-20 w-full bg-gradient-to-br ${grad}`}>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl drop-shadow-sm">{emoji}</span>
                    <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${isOpenNow ? "bg-emerald-500/80 text-white" : "bg-foreground/60 text-background"}`}>
                      {isOpenNow ? "Open Now" : "Closed"}
                    </span>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-semibold truncate">{s.place_name}</h4>
                    {s.category && <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{s.category}</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Your Vibe — Preference Strength ── */}
      {interests.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Your Vibe</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {interests.slice(0, 6).map((interest, i) => {
              const vibe = VIBE_MAP[interest];
              if (!vibe) return null;
              // Mock strength: first interests are "stronger"
              const strength = Math.max(95 - i * 12, 40);
              return (
                <motion.div
                  key={interest}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="text-lg">{vibe.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{vibe.label}</span>
                      <span className="text-[10px] text-muted-foreground">{strength}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${strength}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-hero"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </AppShell>
  );
};

export default Dashboard;
