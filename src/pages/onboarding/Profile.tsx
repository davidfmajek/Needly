import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingShell } from "@/components/needly/OnboardingShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DIET = ["None", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Dairy-free"];
const INTERESTS = ["Coffee", "Fitness", "Study spots", "Nightlife", "Outdoors", "Shopping", "Art", "Music"];
const FOODS = ["Italian", "Asian", "Mexican", "American", "Mediterranean", "Healthy", "Fast food", "Desserts"];

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-4 py-2 text-sm transition-all ${
      active ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [age, setAge] = useState("");
  const [transport, setTransport] = useState("");
  const [budget, setBudget] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [foods, setFoods] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const onNext = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        age_range: age,
        transportation: transport,
        budget,
        dietary_restrictions: diet,
        interests,
        food_preferences: foods,
      },
      { onConflict: "user_id" }
    );
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate("/onboarding/location");
  };

  return (
    <OnboardingShell step={1} total={4} title="Tell us about you" subtitle="Helps Needly tailor recommendations.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Age range</Label>
            <Select value={age} onValueChange={setAge}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["18-24", "25-34", "35-44", "45-54", "55+"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transportation</Label>
            <Select value={transport} onValueChange={setTransport}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["Walking", "Bike", "Transit", "Car", "Rideshare"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Budget</Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["$", "$$", "$$$", "$$$$"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dietary restrictions</Label>
          <div className="flex flex-wrap gap-2">
            {DIET.map((d) => <Chip key={d} active={diet.includes(d)} onClick={() => toggle(diet, setDiet, d)}>{d}</Chip>)}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Interests</Label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((d) => <Chip key={d} active={interests.includes(d)} onClick={() => toggle(interests, setInterests, d)}>{d}</Chip>)}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Food preferences</Label>
          <div className="flex flex-wrap gap-2">
            {FOODS.map((d) => <Chip key={d} active={foods.includes(d)} onClick={() => toggle(foods, setFoods, d)}>{d}</Chip>)}
          </div>
        </div>

        <Button onClick={onNext} disabled={loading} className="h-11 w-full rounded-full bg-gradient-hero shadow-soft hover:opacity-95">
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </OnboardingShell>
  );
};

export default Profile;