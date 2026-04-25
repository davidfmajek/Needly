import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bookmark, Heart, MapPin, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Rec = { name: string; category: string; reason: string; distance: string };

const TOP_PICK: Rec = {
  name: "Bluestone Café",
  category: "Coffee · Study spot",
  reason: "Quiet, fast wifi, oat milk available — fits your vibe perfectly.",
  distance: "4 min walk",
};

const MOCK_RESULTS: Rec[] = [
  { name: "Greenleaf Bowls", category: "Healthy food", reason: "Matches your dietary prefs and budget.", distance: "7 min walk" },
  { name: "Riverside Park", category: "Outdoors", reason: "Great for a quick reset between sessions.", distance: "9 min walk" },
  { name: "North End Gym", category: "Fitness", reason: "Open late, fits your weekly routine.", distance: "12 min walk" },
];

const NEXT_OPTIONS_BY_INTEREST: Record<string, string> = {
  Gym: "Hit the gym",
  School: "Head to a study spot",
  Nightlife: "Find a night out",
  "Sporting Events": "Catch a game",
  Coffee: "Grab a coffee",
  Outdoors: "Go for a walk",
  Shopping: "Run some errands",
  Art: "Visit a gallery",
  Music: "Find live music",
};

const FALLBACK_NEXT = ["Quiet spot to recharge", "Surprise me", "Something new nearby", "Quick bite"];

const easeOutExpo = [0.22, 1, 0.36, 1] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [selectedNext, setSelectedNext] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [results, setResults] = useState<Rec[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("interests")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.interests) setInterests(data.interests as string[]);
    })();
  }, [user]);

  const savePlace = async (r: Rec) => {
    if (!user) return;
    const { error } = await supabase.from("saved_places").insert({
      user_id: user.id,
      place_name: r.name,
      category: r.category,
      reason: r.reason,
    });
    if (error) toast.error(error.message);
    else toast.success(`Saved ${r.name}`);
  };

  const favoriteTopPick = async () => {
    if (favorited) return;
    setFavorited(true);
    await savePlace(TOP_PICK);
  };

  const nextOptions =
    interests
      .map((i) => NEXT_OPTIONS_BY_INTEREST[i])
      .filter((x): x is string => Boolean(x))
      .slice(0, 5) || [];

  const onPickNext = (option: string) => {
    setSelectedNext(option);
    setResults(null);
    setTimeout(() => setResults(MOCK_RESULTS), 400);
  };

  return (
    <AppShell>
      {/* Recommendation pop-up */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-md overflow-hidden rounded-3xl border-border bg-card p-0 shadow-glow">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOutExpo }}
            className="relative p-6"
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Top pick for you
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">{TOP_PICK.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {TOP_PICK.category} · {TOP_PICK.distance}
            </div>
            <p className="mt-4 text-sm text-foreground/80">{TOP_PICK.reason}</p>

            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={favoriteTopPick}
                className="flex-1 rounded-full bg-gradient-hero shadow-soft hover:opacity-95"
              >
                <Heart className={`mr-2 h-4 w-4 ${favorited ? "fill-current" : ""}`} />
                {favorited ? "Saved" : "Favorite"}
              </Button>
              <Button variant="outline" onClick={() => setShowPopup(false)} className="rounded-full">
                See what's next
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* What's next phase */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-semibold tracking-tight">What's Next For You</h1>
        <p className="mt-2 text-muted-foreground">Quick picks based on your routine.</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {(nextOptions.length ? nextOptions : ["Grab a coffee", "Find lunch", "Head outside"]).map((opt) => (
            <button
              key={opt}
              onClick={() => onPickNext(opt)}
              className={`rounded-full border px-4 py-2 text-sm transition-all ${
                selectedNext === opt
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            onClick={() => setShowFallback((s) => !s)}
            className={`rounded-full border px-4 py-2 text-sm transition-all ${
              showFallback ? "border-primary bg-accent" : "border-dashed border-border bg-transparent hover:border-primary/40"
            }`}
          >
            None of these
          </button>
        </div>

        <AnimatePresence>
          {showFallback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex flex-wrap gap-2"
            >
              {FALLBACK_NEXT.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onPickNext(opt)}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    selectedNext === opt
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Result cards with staggered slide-up */}
      <AnimatePresence mode="wait">
        {results && (
          <motion.div
            key={selectedNext}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-12"
          >
            <h2 className="text-lg font-semibold">Recommended for "{selectedNext}"</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {results.map((r, i) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.15, ease: easeOutExpo }}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <MapPin className="h-3.5 w-3.5" /> {r.category}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{r.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{r.distance}</p>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{r.reason}</p>
                  <Button variant="outline" size="sm" onClick={() => savePlace(r)} className="mt-4 rounded-full">
                    <Bookmark className="mr-2 h-4 w-4" /> Save
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default Dashboard;
