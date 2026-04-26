import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Bookmark, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Saved = { id: string; place_name: string; category: string | null; reason: string | null; created_at: string };

const SavedPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data, error } = await supabase.from("saved_places").select("id, place_name, category, reason, created_at").order("created_at", { ascending: false });
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
    toast.success("Removed");
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Saved places</h1>
        <p className="mt-2 text-muted-foreground">Your library of spots that fit your life.</p>

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-16 rounded-3xl border border-dashed border-border bg-card p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
              <Bookmark className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-5 text-lg font-semibold">Nothing saved yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground">Save recommendations from your dashboard.</p>
          </motion.div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {items.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {s.category && <div className="text-xs font-medium text-primary">{s.category}</div>}
                    <h3 className="mt-1 text-lg font-semibold">{s.place_name}</h3>
                    {s.reason && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.reason}</p>}
                    <p className="mt-2 text-xs text-muted-foreground/60">{formatDate(s.created_at, "relative")}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
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