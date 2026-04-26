import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ExternalLink, Loader2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { hourlyGridFromText } from "@/lib/weeklyScheduleFromText";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

type CalendarConnection = {
  provider: string;
  email: string | null;
  expires_at: string | null;
};

const TRANSPORT_OPTIONS = ["Walking", "Bike", "Transit", "Car", "Rideshare"];
const BUDGET_OPTIONS = ["$", "$$", "$$$", "$$$$"];
const INTERESTS = ["Gym", "School", "Nightlife", "Sporting Events", "Coffee", "Outdoors", "Shopping", "Art", "Music"];
const DIET = ["None", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Dairy-free"];

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-smooth ${
      active
        ? "border-primary bg-primary text-primary-foreground shadow-soft"
        : "border-border bg-card hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

export const SettingsDrawer = ({ open, onClose }: SettingsDrawerProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialLoaded = useRef(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [transport, setTransport] = useState("");
  const [budget, setBudget] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [diet, setDiet] = useState<string[]>([]);
  const [week, setWeek] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading">("idle");

  const [calendar, setCalendar] = useState<CalendarConnection | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Load profile + calendar connection whenever the drawer opens.
  useEffect(() => {
    if (!open || !user) return;
    initialLoaded.current = false;
    setLoading(true);

    (async () => {
      const [{ data: profile }, { data: cal }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select(
            "display_name, age, transportation, budget, interests, dietary_restrictions, weekly_schedule_context, latitude, longitude",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_calendar_connections")
          .select("provider, email, expires_at")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profile) {
        setName(profile.display_name ?? "");
        setAge(profile.age != null ? String(profile.age) : "");
        setTransport(profile.transportation ?? "");
        setBudget(profile.budget ?? "");
        setInterests(profile.interests ?? []);
        setDiet(profile.dietary_restrictions ?? []);
        setWeek(profile.weekly_schedule_context ?? "");
        if (profile.latitude != null && profile.longitude != null) {
          setCoords({ lat: profile.latitude, lng: profile.longitude });
        } else {
          setCoords(null);
        }
      }
      setCalendar(cal ?? null);
      setLoading(false);
      initialLoaded.current = true;
    })();
  }, [open, user]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const ageNum = age ? parseInt(age, 10) : null;
    const trimmedWeek = week.trim();
    const grid = trimmedWeek ? hourlyGridFromText(trimmedWeek) : null;
    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        display_name: name.trim() || null,
        age: ageNum && !isNaN(ageNum) ? ageNum : null,
        transportation: transport || null,
        budget: budget || null,
        interests,
        dietary_restrictions: diet,
        weekly_schedule_context: trimmedWeek || null,
        weekly_schedule_grid: grid,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    onClose();
  };

  const refreshLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("idle");
        toast.success("Location updated");
      },
      () => {
        setLocStatus("idle");
        toast.error("Couldn't get your location");
      },
    );
  };

  const connectCalendar = () => {
    // Calendar OAuth isn't wired up yet — surface a clear hint instead of
    // silently failing.
    toast.message("Calendar sync coming soon", {
      description: "We'll redirect you to Google to connect once this is enabled.",
    });
  };

  const disconnectCalendar = async () => {
    if (!user) return;
    setCalendarLoading(true);
    const { error } = await supabase.from("user_calendar_connections").delete().eq("user_id", user.id);
    setCalendarLoading(false);
    if (error) return toast.error(error.message);
    setCalendar(null);
    toast.success("Calendar disconnected");
  };

  return (
    <Drawer open={open} onClose={onClose} title="Settings">
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your profile…
        </div>
      ) : (
        <div className="space-y-8 pb-4">
          {/* Profile basics */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" min={13} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Transportation</Label>
                <Select
                  value={transport}
                  onValueChange={setTransport}
                  placeholder="Select"
                  options={TRANSPORT_OPTIONS.map((a) => ({ value: a, label: a }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Budget</Label>
                <Select
                  value={budget}
                  onValueChange={setBudget}
                  placeholder="Select"
                  options={BUDGET_OPTIONS.map((a) => ({ value: a, label: a }))}
                />
              </div>
            </div>
          </section>

          {/* Interests */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((d) => (
                <Chip key={d} active={interests.includes(d)} onClick={() => toggle(interests, setInterests, d)}>
                  {d}
                </Chip>
              ))}
            </div>
          </section>

          {/* Dietary */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dietary</h3>
            <div className="flex flex-wrap gap-2">
              {DIET.map((d) => (
                <Chip key={d} active={diet.includes(d)} onClick={() => toggle(diet, setDiet, d)}>
                  {d}
                </Chip>
              ))}
            </div>
          </section>

          {/* Weekly schedule */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your week</h3>
            <p className="text-xs text-muted-foreground">A few sentences about your typical week — Needly turns this into your daily plan.</p>
            <Textarea
              rows={5}
              maxLength={2000}
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              placeholder="E.g. Class Mon-Wed 9am-3pm, gym Tue/Thu evenings, brunch Saturdays."
            />
          </section>

          {/* Calendar */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Calendar</h3>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                  <CalendarDays className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  {calendar ? (
                    <>
                      <p className="text-sm font-medium">Connected to {calendar.provider}</p>
                      {calendar.email && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{calendar.email}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">No calendar connected</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Connect your calendar so My Day can blend in your real events.
                      </p>
                    </>
                  )}
                </div>
                {calendar ? (
                  <Button variant="outline" size="sm" onClick={disconnectCalendar} loading={calendarLoading}>
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={connectCalendar}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Connect
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Location</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={refreshLocation} loading={locStatus === "loading"}>
                {coords ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <MapPin className="mr-1.5 h-3.5 w-3.5" />}
                {coords ? `Updated (${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)})` : "Share my location"}
              </Button>
              {coords && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
                  onClick={() => setCoords(null)}
                >
                  Remove
                </button>
              )}
            </div>
          </section>

          {/* Footer actions */}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Save changes
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
