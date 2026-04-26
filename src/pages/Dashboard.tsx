import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Heart, MapPin, Sparkles, Search, ArrowRight, ChevronRight, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useWeeklySchedule } from "@/hooks/useWeeklySchedule";
import { formatHour, scheduleLabelToIntent, labelTitle } from "@/lib/scheduleHelpers";
import { toast } from "sonner";

/* ─── Types ─── */
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
type SavedPlace = { id: string; place_name: string; category: string | null };

const normalizePlaceName = (value: string) => value.trim().toLowerCase();

/* ─── Deterministic gradient + icon text from a category/name pair ─── */
const CARD_GRADIENTS = [
  "from-emerald-400/30 to-teal-500/20",
  "from-blue-400/30 to-indigo-500/20",
  "from-violet-400/30 to-purple-500/20",
  "from-amber-400/30 to-orange-500/20",
  "from-rose-400/30 to-pink-500/20",
  "from-cyan-400/30 to-sky-500/20",
];

function categoryIconText(category: string | null, name: string): string {
  const c = (category ?? "").toLowerCase();
  const n = name.toLowerCase();
  if (c.includes("coffee") || c.includes("café") || c.includes("cafe")) return "CF";
  if (c.includes("food") || c.includes("ramen") || c.includes("mexican") || c.includes("asian") || c.includes("brunch")) return "FD";
  if (c.includes("gym") || c.includes("fitness")) return "GY";
  if (c.includes("library") || c.includes("study") || c.includes("coworking")) return "ST";
  if (c.includes("bar") || c.includes("cocktail") || c.includes("music") || c.includes("entertainment")) return "MU";
  if (c.includes("park") || c.includes("outdoor") || c.includes("trail") || c.includes("garden")) return "PK";
  if (n.includes("café") || n.includes("cafe")) return "CF";
  return "LO";
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
  culture: [
    { name: "City Art Museum", category: "Museum", reason: "Great for a cultural outing nearby.", distance: "1.8 mi", matchPct: 90 },
    { name: "Modern Arts Gallery", category: "Art Gallery", reason: "Popular exhibits and rotating collections.", distance: "2.2 mi", matchPct: 86 },
    { name: "History Center", category: "Museum", reason: "Strong local history exhibits.", distance: "2.9 mi", matchPct: 82 },
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
  if (p.includes("museum") || p.includes("mesuem") || p.includes("gallery") || p.includes("exhibit")) return "culture";
  if (p.includes("coffee") || p.includes("brew")) return "coffee";
  if (p.includes("lunch") || p.includes("dinner") || p.includes("breakfast") || p.includes("bite") || p.includes("food") || p.includes("errand")) return "food";
  if (p.includes("study") || p.includes("class")) return "study";
  if (p.includes("gym") || p.includes("fitness")) return "gym";
  if (p.includes("night out") || p.includes("nightlife")) return "nightout";
  if (p.includes("walk") || p.includes("outside") || p.includes("park") || p.includes("outdoors")) return "outdoors";
  if (p.includes("chill") || p.includes("recharge") || p.includes("wind") || p.includes("surprise")) return "chill";
  return "default";
}

/* ─── Interest-driven pills (from user profile selections) ─── */
function getInterestPills(interests: string[]): string[] {
  const INTEREST_PILL_MAP: Record<string, string> = {
    Gym: "Hit the gym",
    School: "Head to class",
    Nightlife: "Night out",
    "Sporting Events": "Catch a game",
    Coffee: "Coffee run",
    Outdoors: "Go for a walk",
    Shopping: "Quick errand",
    Art: "Visit a gallery",
    Music: "Find live music",
  };

  const fromInterests = interests
    .map((interest) => INTEREST_PILL_MAP[interest])
    .filter((label): label is string => Boolean(label));

  if (fromInterests.length > 0) {
    return [...new Set(fromInterests)].slice(0, 6);
  }

  // Fallback only when the user has no selected interests.
  return ["Coffee run", "Find lunch", "Go for a walk", "Night out", "Find live music"];
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
const VIBE_MAP: Record<string, { iconText: string; label: string }> = {
  Coffee: { iconText: "CF", label: "Coffee Shops" },
  Gym: { iconText: "GY", label: "Fitness" },
  School: { iconText: "ST", label: "Study Spots" },
  Nightlife: { iconText: "NI", label: "Nightlife" },
  Outdoors: { iconText: "OD", label: "Outdoors" },
  Shopping: { iconText: "SH", label: "Shopping" },
  Art: { iconText: "AR", label: "Art & Culture" },
  Music: { iconText: "MU", label: "Live Music" },
  "Sporting Events": { iconText: "SP", label: "Sports" },
};

/* Map a recommendation event's category/intent text to one of the VIBE_MAP
 * interests, so we can roll real behavior back up to the bars in Your Vibe. */
const VIBE_KEYWORD_MATCHERS: { interest: keyof typeof VIBE_MAP; tokens: string[] }[] = [
  { interest: "Coffee",          tokens: ["coffee", "café", "cafe", "espresso", "latte"] },
  { interest: "Gym",             tokens: ["gym", "fitness", "workout", "yoga", "pilates"] },
  { interest: "School",          tokens: ["library", "study", "school", "campus", "coworking"] },
  { interest: "Nightlife",       tokens: ["bar", "club", "nightlife", "lounge", "cocktail", "nightout"] },
  { interest: "Outdoors",        tokens: ["park", "outdoor", "trail", "garden", "hike"] },
  { interest: "Shopping",        tokens: ["shop", "store", "market", "boutique", "mall"] },
  { interest: "Art",             tokens: ["museum", "gallery", "art", "exhibit", "culture"] },
  { interest: "Music",           tokens: ["music", "concert", "live", "vinyl", "venue"] },
  { interest: "Sporting Events", tokens: ["sport", "stadium", "arena", "game"] },
];

function matchVibeInterest(text: string | null | undefined): keyof typeof VIBE_MAP | null {
  if (!text) return null;
  const haystack = text.toLowerCase();
  for (const { interest, tokens } of VIBE_KEYWORD_MATCHERS) {
    if (tokens.some((t) => haystack.includes(t))) return interest;
  }
  return null;
}

/* Weight events by intent so a save means more than an impression. Mirrors
 * the weights used by the user_place_affinities materialized view. */
const EVENT_WEIGHTS: Record<string, number> = {
  open_directions: 5,
  save: 4,
  result_click: 2,
  intent_selected: 1.5,
  result_impression: 0.5,
  unsave: -1,
};

/* Predict what the user will likely need before/around their next agenda
 * item, so the dashboard can preload a relevant recommendation strip. */
function nextAgendaSuggestion(label: string, hour: number): { phrase: string; intent: string; query: string } | null {
  const intent = scheduleLabelToIntent(label);
  if (!intent) return null;
  const pretty = labelTitle(label);
  const at = formatHour(hour);
  // Choose phrasing that reflects "before" vs "during" the activity.
  if (label === "class" || label === "work" || label === "study") {
    return { phrase: `Coffee before ${pretty.toLowerCase()} at ${at}`, intent: "coffee", query: "" };
  }
  if (label === "gym") {
    return { phrase: `Pre-gym fuel before ${at}`, intent: "food", query: "smoothie snack" };
  }
  if (label === "lunch" || label === "dinner" || label === "brunch") {
    return { phrase: `${pretty} spots near you`, intent: "food", query: label };
  }
  if (label === "nightlife" || label === "date") {
    return { phrase: `Dinner before ${pretty.toLowerCase()}`, intent: "food", query: "dinner" };
  }
  if (label === "commute") {
    return { phrase: `Coffee for the commute`, intent: "coffee", query: "" };
  }
  return { phrase: `Recommended for ${pretty.toLowerCase()} at ${at}`, intent, query: "" };
}

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
const GEO_CACHE_MAX_SIZE = 100;
const GEO_CACHE = new Map<string, string>();
const GEO_IN_FLIGHT = new Map<string, Promise<string>>();

function formatLocationLabel(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "Location not set";
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

function geocodeCacheKey(lat: number, lng: number): string {
  // 3 decimals ~= 110m precision and dramatically improves cache hits.
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function setGeocodeCache(key: string, value: string) {
  if (GEO_CACHE.has(key)) GEO_CACHE.delete(key);
  GEO_CACHE.set(key, value);
  if (GEO_CACHE.size > GEO_CACHE_MAX_SIZE) {
    const oldestKey = GEO_CACHE.keys().next().value;
    if (oldestKey) GEO_CACHE.delete(oldestKey);
  }
}

async function getCityStateLabel(lat: number, lng: number): Promise<string> {
  const key = geocodeCacheKey(lat, lng);
  const cached = GEO_CACHE.get(key);
  if (cached) return cached;

  const inFlight = GEO_IN_FLIGHT.get(key);
  if (inFlight) return inFlight;

  const reverseGeocodePromise = (async () => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
    );
      if (!response.ok) return formatLocationLabel(lat, lng);
    const data = await response.json();
    const address = data?.address ?? {};
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.hamlet ??
      address.municipality ??
      address.suburb;
    const rawState = address.state_code ?? address["ISO3166-2-lvl4"] ?? address.state ?? address.region;
    const state =
      typeof rawState === "string" && rawState.includes("-")
        ? rawState.split("-").pop()
        : rawState;
      if (city && state) return `${city}, ${String(state).toUpperCase()}`;
      if (city) return `${city}`;
      if (state) return `${String(state).toUpperCase()}`;
    return formatLocationLabel(lat, lng);
  } catch {
    return formatLocationLabel(lat, lng);
  }
  })();

  GEO_IN_FLIGHT.set(key, reverseGeocodePromise);
  const label = await reverseGeocodePromise;
  GEO_IN_FLIGHT.delete(key);
  setGeocodeCache(key, label);
  return label;
}

/* ═══════════════════════════════════════════════════
   Dashboard Component
   ═══════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState("Location not set");
  const [showPopup, setShowPopup] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("needly_top_pick_dismissed") !== "1",
  );
  const dismissTopPick = () => {
    try { sessionStorage.setItem("needly_top_pick_dismissed", "1"); } catch { /* sessionStorage unavailable */ }
    setShowPopup(false);
  };
  const [selectedNext, setSelectedNext] = useState<string | null>(null);
  const [lastWasSearch, setLastWasSearch] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [results, setResults] = useState<Rec[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [savedSpots, setSavedSpots] = useState<SavedPlace[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [vibeStrengths, setVibeStrengths] = useState<Record<string, number>>({});
  const [agendaPhrase, setAgendaPhrase] = useState<string | null>(null);
  const agendaTriedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { grid: weeklyGrid } = useWeeklySchedule();

  const placeholder = useRotatingPlaceholder();
  const now = new Date();
  const hour = now.getHours();
  const dayIndex = now.getDay();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const timePeriod = hour >= 5 && hour < 12 ? "Morning" : hour >= 12 && hour < 17 ? "Afternoon" : hour >= 17 && hour < 21 ? "Evening" : "Night";
  const vibePrefix = hour >= 21 || hour < 5 ? "Night" : hour >= 17 ? "Evening" : hour >= 12 ? "Daytime" : "Morning";
  const subheader = getSubheader(hour, dayIndex);

  useEffect(() => {
    if (!user) return;

    const requestAndPersistBrowserLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const cityStateLabel = await getCityStateLabel(lat, lng);
          setLocationLabel(cityStateLabel);
          await supabase.from("user_profiles").upsert(
            { user_id: user.id, latitude: lat, longitude: lng },
            { onConflict: "user_id" },
          );
        },
        () => {
          // Keep existing label when user denies or location fails.
        },
      );
    };

    (async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("interests, display_name, latitude, longitude")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        requestAndPersistBrowserLocation();
        return;
      }
      if (data?.interests) setInterests(data.interests as string[]);
      if (data?.display_name) setDisplayName(data.display_name);
      const hasDbCoords = data?.latitude != null && data?.longitude != null;
      if (hasDbCoords) {
        const cityStateLabel = await getCityStateLabel(data.latitude as number, data.longitude as number);
        setLocationLabel(cityStateLabel);
      } else {
        setLocationLabel("Location not set");
        requestAndPersistBrowserLocation();
      }
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

  // Compute Your Vibe strengths from real recommendation behavior. We aggregate
  // recent events by interest and normalize the top one to ~95% so the bars
  // tell a real story instead of decorating mock data.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_recommendation_events")
        .select("category, intent, event_type, place_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      const totals: Record<string, number> = {};
      for (const event of data ?? []) {
        const text = event.category ?? event.intent ?? event.place_name ?? "";
        const interest = matchVibeInterest(text);
        if (!interest) continue;
        const weight = EVENT_WEIGHTS[event.event_type] ?? 0.5;
        totals[interest] = (totals[interest] ?? 0) + weight;
      }
      const max = Math.max(...Object.values(totals), 0);
      if (max === 0) {
        setVibeStrengths({});
        return;
      }
      const next: Record<string, number> = {};
      for (const [interest, score] of Object.entries(totals)) {
        next[interest] = Math.max(40, Math.min(95, Math.round((score / max) * 95)));
      }
      setVibeStrengths(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isPlaceSaved = (placeName: string) =>
    savedSpots.some((spot) => normalizePlaceName(spot.place_name) === normalizePlaceName(placeName));

  const logRecommendationEvent = async (
    eventType: string,
    rec?: Rec,
    extra?: Record<string, unknown>,
  ) => {
    if (!user) return;
    await supabase.from("user_recommendation_events").insert({
      user_id: user.id,
      event_type: eventType,
      place_id: rec?.id ?? null,
      place_name: rec?.name ?? null,
      intent: selectedNext,
      category: rec?.category ?? null,
      latitude: rec?.latitude ?? null,
      longitude: rec?.longitude ?? null,
      zone_label: locationLabel || null,
      metadata: (extra ?? {}) as Json,
    });
  };

  const toggleSavedPlace = async (r: Rec): Promise<"saved" | "unsaved" | null> => {
    if (!user) return;
    const alreadySaved = isPlaceSaved(r.name);

    if (alreadySaved) {
      const { error } = await supabase
        .from("saved_places")
        .delete()
        .eq("user_id", user.id)
        .eq("place_name", r.name);

      if (error) {
        toast.error(error.message);
        return null;
      }

      setSavedSpots((prev) => prev.filter((spot) => normalizePlaceName(spot.place_name) !== normalizePlaceName(r.name)));
      toast.success(`Removed ${r.name}`);
      return "unsaved";
    }

    const { data, error } = await supabase
      .from("saved_places")
      .insert({ user_id: user.id, place_name: r.name, category: r.category, reason: r.reason })
      .select("id, place_name, category")
      .single();

    if (error) {
      toast.error(error.message);
      return null;
    }

    setSavedSpots((prev) => [data, ...prev].slice(0, 10));
    toast.success(`Saved ${r.name}`);
    return "saved";
  };

  const isTopPickSaved = isPlaceSaved(TOP_PICK.name);

  const timePills = getInterestPills(interests);

  const onPickNext = (
    option: string,
    fromSearch = false,
    override?: { intent?: string; query?: string },
  ) => {
    setSelectedNext(option);
    setLastWasSearch(fromSearch);
    setResults(null);
    setLoadingResults(true);
    const key = override?.intent ?? getResultKey(option);
    const queryText = override?.query ?? (fromSearch ? option : "");
    (async () => {
      await logRecommendationEvent("intent_selected", undefined, { option, fromSearch });
      const { data, error } = await supabase.functions.invoke("places-nearby", {
        body: {
          intent: key,
          query: queryText,
          limit: 9,
        },
      });

      if (error) {
        setResults([]);
        setLoadingResults(false);
        toast.error("Couldn't load nearby places right now.");
        return;
      }

      const liveResults = (data?.results ?? []) as Rec[];
      setResults(liveResults);
      await Promise.all(
        liveResults.map((r) => logRecommendationEvent("result_impression", r, { selectedIntent: option })),
      );
      if (liveResults.length === 0) {
        toast.message("No open places found nearby right now.");
      }
      setLoadingResults(false);
    })();
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    onPickNext(q, true);
    setSearchValue("");
  };

  // "Recommended for next thing on agenda" — when the schedule grid is loaded
  // and the user hasn't picked anything yet, scan the rest of today for the
  // next non-free hour and quietly preload places for that activity.
  useEffect(() => {
    if (!weeklyGrid) return;
    if (agendaTriedRef.current) return;
    if (selectedNext || results) return;
    const now = new Date();
    const todayRow = weeklyGrid.cells[now.getDay()];
    if (!todayRow) return;
    let nextHour = -1;
    let nextLabel: string | null = null;
    for (let h = now.getHours() + 1; h < 24; h++) {
      const cell = todayRow[h];
      if (cell) {
        nextHour = h;
        nextLabel = cell;
        break;
      }
    }
    if (!nextLabel) return;
    const suggestion = nextAgendaSuggestion(nextLabel.toLowerCase(), nextHour);
    if (!suggestion) return;
    agendaTriedRef.current = true;
    setAgendaPhrase(suggestion.phrase);
    onPickNext(suggestion.phrase, false, { intent: suggestion.intent, query: suggestion.query });
  }, [weeklyGrid, selectedNext, results]);

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
            AI Match: {TOP_PICK.matchPct}%
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">{TOP_PICK.name}</h2>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {TOP_PICK.category} · {TOP_PICK.distance}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">{TOP_PICK.reason}</p>
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={async () => {
                const action = await toggleSavedPlace(TOP_PICK);
                if (action === "saved") await logRecommendationEvent("save", TOP_PICK, { source: "top_pick" });
                if (action === "unsaved") await logRecommendationEvent("unsave", TOP_PICK, { source: "top_pick" });
              }}
              className="flex-1"
            >
              <Heart className={`mr-2 h-4 w-4 ${isTopPickSaved ? "fill-current" : ""}`} />
              {isTopPickSaved ? "Saved" : "Favorite"}
            </Button>
            <Button variant="outline" onClick={dismissTopPick}>See what's next</Button>
          </div>
        </div>
      </Dialog>

      {/* ── Main content ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-card/90 via-card/70 to-transparent p-5 md:p-7 shadow-[0_18px_70px_-30px_rgba(68,130,255,0.55)]">
        <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />

        {/* Context bar */}
        <div className="relative z-10 mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] tracking-wide text-muted-foreground backdrop-blur">
          <span>{locationLabel}</span>
          <span className="text-border">•</span>
          <span>{vibePrefix} - {dayName} {timePeriod} Vibe</span>
        </div>

        {/* Greeting */}
        <h1 className="relative z-10 text-3xl font-bold tracking-tight md:text-4xl">
          {greeting}
          {displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="relative z-10 mt-1 text-sm text-muted-foreground md:text-base">{subheader}</p>

        {/* Search bar */}
        <form onSubmit={onSearch} className="relative z-10 mt-6">
          <div className="group relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-border/80 bg-background/70 py-4 pl-12 pr-14 text-sm shadow-soft placeholder:text-muted-foreground/60 backdrop-blur transition-smooth focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft transition-smooth hover:scale-[1.03] hover:opacity-90"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Time-aware pills */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-2">
          {timePills.map((opt) => (
            <motion.button key={opt} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => onPickNext(opt)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                selectedNext === opt
                  ? "border-primary/70 bg-primary text-primary-foreground shadow-soft"
                  : "border-border/80 bg-background/65 hover:border-primary/40 hover:bg-accent/40"
              }`}
            >{opt}</motion.button>
          ))}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => setShowFallback((s) => !s)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              showFallback ? "border-primary bg-accent" : "border-dashed border-border/80 bg-transparent hover:border-primary/40"
            }`}
          >None of these</motion.button>
        </div>

        <AnimatePresence>
          {showFallback && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative z-10 mt-3 flex flex-wrap gap-2">
              {FALLBACK.map((opt) => (
                <motion.button key={opt} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => onPickNext(opt)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    selectedNext === opt
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border/80 bg-background/65 hover:border-primary/40"
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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Recommended for "{selectedNext}"</h2>
              {selectedNext === agendaPhrase && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" /> From your agenda
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {results.map((r, i) => (
                <motion.div key={r.name} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.12, ease }}
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    void logRecommendationEvent("result_click", r, { source: "result_card" });
                  }}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-glow"
                >
                  {/* AI match badge */}
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary animate-pulse-glow" style={{ animationDuration: "4s" }}>
                      AI Match: {r.matchPct}%
                    </span>
                    {lastWasSearch && selectedNext && (
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground">
                        Tailored to: {selectedNext}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary"><MapPin className="h-3.5 w-3.5" /> {r.category}</div>
                  <h3 className="mt-2 text-lg font-semibold">{r.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{r.distance}</p>
                  {r.openNow === true && (
                    <p className="mt-1 text-xs font-medium text-emerald-400">Open now</p>
                  )}
                  {r.openNow === false && (
                    <p className="mt-1 text-xs font-medium text-amber-300">Closed now</p>
                  )}
                  {r.todayHours && (
                    <p className="mt-1 text-xs text-muted-foreground">Today: {r.todayHours}</p>
                  )}
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{r.reason}</p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (event) => {
                        event.stopPropagation();
                        const action = await toggleSavedPlace(r);
                        if (action === "saved") await logRecommendationEvent("save", r, { source: "result_card" });
                        if (action === "unsaved") await logRecommendationEvent("unsave", r, { source: "result_card" });
                      }}
                      className="flex-1"
                    >
                      <Bookmark className="mr-2 h-4 w-4" /> {isPlaceSaved(r.name) ? "Unsave" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (event) => {
                        event.stopPropagation();
                        const destination = encodeURIComponent(
                          r.latitude != null && r.longitude != null
                            ? `${r.latitude},${r.longitude}`
                            : r.name,
                        );
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
                        await logRecommendationEvent("open_directions", r, { source: "result_card" });
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Saved Spots Carousel ── */}
      <section className="mt-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Your Saved Spots</h2>
          {savedSpots.length > 0 && (
            <a href="/saved" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ChevronRight className="h-3 w-3" />
            </a>
          )}
        </div>
        {savedSpots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/45 p-8 text-center backdrop-blur-sm">
            <Bookmark className="mx-auto h-6 w-6 text-muted-foreground/80" />
            <p className="mt-2 text-sm text-muted-foreground">No saved spots yet. Save recommendations above.</p>
            <p className="mt-1 text-xs text-muted-foreground/80">Tip: save a few to build your personal shortlist.</p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {savedSpots.map((s, i) => {
              const grad = gradientFor(s.id || s.place_name);
              const iconText = categoryIconText(s.category, s.place_name);
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
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide drop-shadow-sm">{iconText}</span>
                    <span className="absolute left-2 top-2 rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Saved
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

      {/* ── Your Vibe — Preference Strength (data-driven) ── */}
      {interests.length > 0 && (
        <section className="mt-10 rounded-2xl border border-border/70 bg-card/50 p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Your Vibe</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {Object.keys(vibeStrengths).length > 0 ? "Based on saves & taps" : "Preference Strength"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {interests.slice(0, 6).map((interest, i) => {
              const vibe = VIBE_MAP[interest];
              if (!vibe) return null;
              // Real strength when we have behavioral data, otherwise a soft
              // baseline that decays from the order of selection.
              const realStrength = vibeStrengths[interest];
              const strength = realStrength ?? Math.max(70 - i * 8, 40);
              return (
                <motion.div
                  key={interest}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 p-3 backdrop-blur-sm"
                >
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-1.5 text-[10px] font-semibold tracking-wide text-primary">
                    {vibe.iconText}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{vibe.label}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{strength}%</span>
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
