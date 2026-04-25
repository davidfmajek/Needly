import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const QUICK = [
  "Heading to class", "Going to work", "Lunch break", "Gym session",
  "Running errands", "Free time", "Studying", "Night out",
];

type Rec = { name: string; category: string; reason: string };

const MOCK_RECS: Rec[] = [
  { name: "Bluestone Café", category: "Coffee", reason: "Quiet, fast wifi, matches your study vibe — 4 min walk." },
  { name: "Greenleaf Bowls", category: "Healthy food", reason: "Fits your dietary prefs and budget — 7 min walk." },
  { name: "Riverside Park", category: "Outdoors", reason: "Good for a quick reset between sessions." },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [context, setContext] = useState("");
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [loading, setLoading] = useState(false);

  const find = () => {
    setLoading(true);
    setTimeout(() => {
      setRecs(MOCK_RECS);
      setLoading(false);
    }, 600);
  };

  const save = async (r: Rec) => {
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

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-semibold tracking-tight">What do you need?</h1>
        <p className="mt-2 text-muted-foreground">Pick a moment or describe it in your own words.</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setContext(q)}
              className={`rounded-full border px-4 py-2 text-sm transition-all ${
                context === q ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Tell Needly what you need"
            className="h-12 rounded-full border-border bg-card px-5 text-base shadow-soft"
          />
          <Button onClick={find} disabled={loading} className="h-12 rounded-full bg-gradient-hero px-6 shadow-soft hover:opacity-95">
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? "Thinking..." : "Find what I need"}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {recs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-12">
            <h2 className="text-lg font-semibold">Recommendations</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {recs.map((r, i) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <MapPin className="h-3.5 w-3.5" /> {r.category}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{r.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.reason}</p>
                  <Button variant="outline" size="sm" onClick={() => save(r)} className="mt-4 rounded-full">
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