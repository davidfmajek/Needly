import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingShell } from "@/components/needly/OnboardingShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Schedule = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const onNext = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("user_profiles").update({ weekly_schedule_context: text }).eq("user_id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate("/onboarding/context");
  };

  return (
    <OnboardingShell step={3} total={4} title="What does your week usually look like?" subtitle="A few sentences are perfect.">
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="E.g. Class Mon-Wed 9am-3pm, gym Tue/Thu evenings, work part-time at a cafe on weekends..."
          rows={6}
          maxLength={2000}
          className="resize-none rounded-2xl border-border bg-card pr-14 text-base shadow-soft"
        />
        <button
          type="button"
          onClick={() => toast("Voice input coming soon")}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all hover:bg-accent/70"
          aria-label="Voice input"
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>
      <Button onClick={onNext} disabled={loading || !text.trim()} className="mt-6 h-11 w-full rounded-full bg-gradient-hero shadow-soft hover:opacity-95">
        {loading ? "Saving..." : "Continue"}
      </Button>
    </OnboardingShell>
  );
};

export default Schedule;