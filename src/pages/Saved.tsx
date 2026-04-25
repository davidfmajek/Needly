import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Saved = { id: string; place_name: string; category: string | null; reason: string | null; created_at: string };

const SavedPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("saved_places")
        .select("id, place_name, category, reason, created_at")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setItems(data ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_places").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-semibold tracking-tight">Saved places</h1>
        <p className="mt-2 text-muted-foreground">Your library of spots that fit your life.</p>

        {loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 font-medium">Nothing saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Save recommendations from your dashboard.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {items.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {s.category && <div className="text-xs font-medium text-primary">{s.category}</div>}
                    <h3 className="mt-1 text-lg font-semibold">{s.place_name}</h3>
                    {s.reason && <p className="mt-1 text-sm text-muted-foreground">{s.reason}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AppShell>
  );
};

export default SavedPage;