import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/needly/Logo";
import { ThemeToggle } from "@/components/needly/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Check } from "lucide-react";

const DIET = ["None", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Dairy-free"];
const INTERESTS = ["Gym", "School", "Nightlife", "Sporting Events", "Coffee", "Outdoors", "Shopping", "Art", "Music"];
const FOODS = ["Fast food", "American", "Italian", "Mexican", "Asian", "Mediterranean", "Healthy", "Desserts"];

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-4 py-2 text-sm transition-all ${
      active
        ? "border-primary bg-primary text-primary-foreground shadow-soft"
        : "border-border bg-card hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [age, setAge] = useState("");
  const [transport, setTransport] = useState("");
  const [budget, setBudget] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [otherInterests, setOtherInterests] = useState("");
  const [foods, setFoods] = useState<string[]>([]);
  const [week, setWeek] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "done">("idle");
  const [loading, setLoading] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const requestLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("done");
      },
      () => {
        setLocStatus("idle");
        toast.error("Couldn't get your location");
      }
    );
  };

  const onSubmit = async () => {
    if (!user) return;
    if (!age || !transport || !budget) return toast.error("Please complete the basics");
    setLoading(true);
    const ageNum = parseInt(age, 10);
    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        age: isNaN(ageNum) ? null : ageNum,
        transportation: transport,
        budget,
        dietary_restrictions: diet,
        interests,
        other_interests: otherInterests || null,
        food_preferences: foods,
        weekly_schedule_context: week || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        onboarding_completed: true,
      },
      { onConflict: "user_id" }
    );
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-semibold tracking-tight">Tell Needly about you</h1>
          <p className="mt-2 text-muted-foreground">A few quick details so we can predict what you need.</p>
        </motion.div>

        <div className="mt-8 space-y-5">
          <Section title="About you">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" min={13} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 22" />
              </div>
              <div className="space-y-2">
                <Label>Transportation</Label>
                <Select value={transport} onValueChange={setTransport}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Walking", "Bike", "Transit", "Car", "Rideshare"].map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Budget</Label>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["$", "$$", "$$$", "$$$$"].map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Dietary restrictions" subtitle="Pick any that apply.">
            <div className="flex flex-wrap gap-2">
              {DIET.map((d) => (
                <Chip key={d} active={diet.includes(d)} onClick={() => toggle(diet, setDiet, d)}>{d}</Chip>
              ))}
            </div>
          </Section>

          <Section title="Interests" subtitle="What do you spend time on?">
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((d) => (
                <Chip key={d} active={interests.includes(d)} onClick={() => toggle(interests, setInterests, d)}>{d}</Chip>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Label>Other interests</Label>
              <Input
                placeholder="Anything else? (e.g. board games, hiking)"
                value={otherInterests}
                onChange={(e) => setOtherInterests(e.target.value)}
              />
            </div>
          </Section>

          <Section title="Food preferences">
            <div className="flex flex-wrap gap-2">
              {FOODS.map((d) => (
                <Chip key={d} active={foods.includes(d)} onClick={() => toggle(foods, setFoods, d)}>{d}</Chip>
              ))}
            </div>
          </Section>

          <Section title="What does your week look like?" subtitle="A few sentences are perfect.">
            <Textarea
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="E.g. Class Mon-Wed 9am-3pm, gym Tue/Thu evenings, work part-time at a cafe on weekends..."
              className="resize-none rounded-2xl"
            />
          </Section>

          <Section title="Location" subtitle="Optional — helps us recommend nearby spots.">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={requestLocation}
                disabled={locStatus === "loading"}
                className="rounded-full"
              >
                {locStatus === "done" ? <Check className="mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
                {locStatus === "done"
                  ? `Got it (${coords?.lat.toFixed(2)}, ${coords?.lng.toFixed(2)})`
                  : locStatus === "loading"
                  ? "Locating..."
                  : "Share my location"}
              </Button>
            </div>
          </Section>

          <Button
            onClick={onSubmit}
            disabled={loading}
            className="h-12 w-full rounded-full bg-gradient-hero shadow-soft hover:opacity-95"
          >
            {loading ? "Saving..." : "Continue to Needly"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
