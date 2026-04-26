import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Logo } from "@/components/needly/Logo";
import { ThemeToggle } from "@/components/needly/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { hourlyGridFromText } from "@/lib/weeklyScheduleFromText";

const DIET = ["None", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Dairy-free"];
const INTERESTS = [
  "Gym",
  "School",
  "Nightlife",
  "Sporting Events",
  "Coffee",
  "Outdoors",
  "Shopping",
  "Art",
  "Music",
  "Gaming",
  "Travel",
  "Books",
  "Tech",
  "Movies",
  "Volunteering",
];
const FOODS = ["Fast food", "American", "Italian", "Mexican", "Asian", "Mediterranean", "Healthy", "Desserts"];
const STEPS = ["About you", "Preferences", "Lifestyle", "Location"];

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.95 }}
    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
      active ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card hover:border-primary/40"
    }`}
  >
    {children}
  </motion.button>
);

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
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

  // Debounced auto-save of "What does your week look like?" — runs while
  // the user is on the lifestyle step so the parsed grid is ready by the
  // time they reach Settings or My Day.
  const lastSavedWeek = useRef<string>("");
  useEffect(() => {
    if (!user) return;
    const trimmed = week.trim();
    if (trimmed === lastSavedWeek.current) return;
    const handle = setTimeout(async () => {
      const grid = trimmed ? hourlyGridFromText(trimmed) : null;
      const { error } = await supabase.from("user_profiles").upsert({
        user_id: user.id,
        weekly_schedule_context: trimmed || null,
        weekly_schedule_grid: grid,
      }, { onConflict: "user_id" });
      if (!error) lastSavedWeek.current = trimmed;
    }, 700);
    return () => clearTimeout(handle);
  }, [week, user]);

  const requestLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus("done"); },
      () => { setLocStatus("idle"); toast.error("Couldn't get your location"); }
    );
  };

  const onSubmit = async () => {
    if (!user) return;
    if (!name.trim() || !age || !transport || !budget) {
      return toast.error("Please complete the basics (step 1)");
    }
    setLoading(true);
    const ageNum = parseInt(age, 10);
    const grid = week.trim() ? hourlyGridFromText(week.trim()) : null;
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      display_name: name.trim(),
      age: isNaN(ageNum) ? null : ageNum,
      transportation: transport,
      budget,
      dietary_restrictions: diet,
      interests,
      other_interests: otherInterests || null,
      food_preferences: foods,
      weekly_schedule_context: week.trim() || null,
      weekly_schedule_grid: grid,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      onboarding_completed: true,
    }, { onConflict: "user_id" });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate("/dashboard");
  };

  const canNext = step === 0 ? !!name.trim() && !!age && !!transport && !!budget : true;
  const isLast = step === STEPS.length - 1;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  const [direction, setDirection] = useState(0);
  const goNext = () => { setDirection(1); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)); };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Tell Needly about you</h1>
          <p className="mt-2 text-muted-foreground">A few quick details so we can predict what you need.</p>
        </motion.div>

        {/* Progress bar */}
        <div className="mt-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-xs font-medium transition-colors ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="mt-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-semibold">The basics</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
                      </div>
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input type="number" min={13} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 22" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Transportation</Label>
                        <Select value={transport} onValueChange={setTransport} placeholder="Select" options={["Walking", "Bike", "Transit", "Car", "Rideshare"].map((a) => ({ value: a, label: a }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Budget</Label>
                        <Select value={budget} onValueChange={setBudget} placeholder="Select" options={["$", "$$", "$$$", "$$$$"].map((a) => ({ value: a, label: a }))} />
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold">Dietary restrictions</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Pick any that apply.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {DIET.map((d) => (<Chip key={d} active={diet.includes(d)} onClick={() => toggle(diet, setDiet, d)}>{d}</Chip>))}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Food preferences</h2>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {FOODS.map((d) => (<Chip key={d} active={foods.includes(d)} onClick={() => toggle(foods, setFoods, d)}>{d}</Chip>))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold">Interests</h2>
                      <p className="mt-1 text-sm text-muted-foreground">What do you spend time on?</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {INTERESTS.map((d) => (<Chip key={d} active={interests.includes(d)} onClick={() => toggle(interests, setInterests, d)}>{d}</Chip>))}
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label>Other interests</Label>
                        <Input placeholder="e.g. board games, hiking" value={otherInterests} onChange={(e) => setOtherInterests(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">What does your week look like?</h2>
                      <p className="mt-1 text-sm text-muted-foreground">A few sentences are perfect.</p>
                      <Textarea className="mt-4" value={week} onChange={(e) => setWeek(e.target.value)} rows={4} maxLength={2000} placeholder="E.g. Class Mon-Wed 9am-3pm, gym Tue/Thu evenings..." />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Location</h2>
                    <p className="text-sm text-muted-foreground">Optional — helps us recommend nearby spots.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" onClick={requestLocation} loading={locStatus === "loading"}>
                        {locStatus === "done" ? <Check className="mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
                        {locStatus === "done" ? `Got it (${coords?.lat.toFixed(2)}, ${coords?.lng.toFixed(2)})` : locStatus === "loading" ? "Locating..." : "Share my location"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          {isLast ? (
            <Button onClick={onSubmit} loading={loading} className="shadow-soft">Continue to Needly <ArrowRight className="ml-2 h-4 w-4" /></Button>
          ) : (
            <Button onClick={goNext} disabled={!canNext}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
