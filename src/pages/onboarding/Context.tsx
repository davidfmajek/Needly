import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingShell } from "@/components/needly/OnboardingShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Context = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const onFinish = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("user_profiles")
      .update({ initial_context: text, onboarding_completed: true })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate("/dashboard");
  };

  return (
    <OnboardingShell step={4} total={4} title="What do you need right now?" subtitle="Last step — then you're in.">
      <div className="relative">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A quiet place to study, somewhere for lunch..."
          maxLength={300}
          className="h-14 rounded-2xl border-border bg-card pr-14 text-base shadow-soft"
        />
        <button
          type="button"
          onClick={() => toast("Voice input coming soon")}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground hover:bg-accent/70"
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>
      <Button onClick={onFinish} disabled={loading} className="mt-6 h-11 w-full rounded-full bg-gradient-hero shadow-soft hover:opacity-95">
        {loading ? "Finishing..." : "Finish & enter Needly"}
      </Button>
    </OnboardingShell>
  );
};

export default Context;