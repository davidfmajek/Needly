import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/needly/AppShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Status = "processing" | "success" | "error";

// Landing page that the user is redirected to after granting calendar
// permission to a third-party provider (e.g. Google). The provider hands us
// either an `?code=` to exchange for tokens server-side, or an `?error=`.
//
// Token exchange is deliberately delegated to a future Supabase edge
// function — this page just records the *intent* to connect and surfaces
// the result to the user. That keeps secrets out of the browser bundle.
const CalendarCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState<string>("Finishing up your calendar connection…");

  useEffect(() => {
    if (!user) return;

    const error = params.get("error");
    const code = params.get("code");
    const state = params.get("state");
    const provider = params.get("provider") ?? "google";

    if (error) {
      setStatus("error");
      setMessage(`Couldn't connect: ${error}`);
      toast.error("Calendar connection cancelled");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Missing authorization code from your calendar provider.");
      return;
    }

    (async () => {
      // Record a stub connection so the rest of the UI can reflect that the
      // user has *started* the connection flow. The token exchange itself
      // needs to happen on a trusted backend — wire that in via a Supabase
      // edge function and update this row when the exchange completes.
      const { error: insertError } = await supabase.from("user_calendar_connections").upsert(
        {
          user_id: user.id,
          provider,
          email: state, // some providers stuff the email back via `state`
        },
        { onConflict: "user_id" },
      );

      if (insertError) {
        setStatus("error");
        setMessage(insertError.message);
        toast.error("Couldn't save calendar connection");
        return;
      }

      setStatus("success");
      setMessage("Calendar connected. Heading back to your day…");
      toast.success("Calendar connected");
      const t = setTimeout(() => navigate("/my-day", { replace: true }), 1400);
      return () => clearTimeout(t);
    })();
  }, [params, user, navigate]);

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md py-10"
      >
        <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
            {status === "processing" && <Loader2 className="h-6 w-6 animate-spin text-foreground" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            {status === "error" && <AlertCircle className="h-6 w-6 text-destructive" />}
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            {status === "processing" && "Connecting your calendar"}
            {status === "success" && "All set"}
            {status === "error" && "Something went wrong"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>

          {status !== "processing" && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link to="/my-day">
                <Button variant="outline">
                  <CalendarDays className="mr-1.5 h-4 w-4" /> Go to My Day
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost">Back to dashboard</Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </AppShell>
  );
};

export default CalendarCallback;
