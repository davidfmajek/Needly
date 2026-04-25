import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { OnboardingShell } from "@/components/needly/OnboardingShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Check } from "lucide-react";
import { toast } from "sonner";

const Location = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const request = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return toast.error("Geolocation unavailable");
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (user) {
          await supabase.from("user_profiles").update({ latitude: lat, longitude: lng }).eq("user_id", user.id);
        }
        setStatus("done");
      },
      () => {
        setStatus("error");
        toast.error("Couldn't get your location");
      }
    );
  };

  return (
    <OnboardingShell step={2} total={4} title="Where are you?" subtitle="We'll use your location to find spots nearby.">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
        <motion.div
          animate={{ scale: status === "done" ? 1 : [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: status === "done" ? 0 : Infinity }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero shadow-glow"
        >
          {status === "done" ? <Check className="h-7 w-7 text-primary-foreground" /> : <MapPin className="h-7 w-7 text-primary-foreground" />}
        </motion.div>
        <p className="mt-4 text-sm text-muted-foreground">
          {status === "done" && coords
            ? `Got it: ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
            : "We'll only use it to recommend places."}
        </p>
        <Button
          onClick={status === "done" ? () => navigate("/onboarding/schedule") : request}
          disabled={status === "loading"}
          className="mt-6 h-11 rounded-full bg-gradient-hero px-8 shadow-soft hover:opacity-95"
        >
          {status === "loading" ? "Locating..." : status === "done" ? "Continue" : "Share my location"}
        </Button>
        {status !== "done" && (
          <button onClick={() => navigate("/onboarding/schedule")} className="mt-3 block w-full text-xs text-muted-foreground hover:underline">
            Skip for now
          </button>
        )}
      </div>
    </OnboardingShell>
  );
};

export default Location;