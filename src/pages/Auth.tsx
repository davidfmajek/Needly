import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/needly/Logo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = `${mode === "signup" ? "Sign up" : "Log in"} · Needly`;
  }, [mode]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        toast.success("Account created!");
        navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-soft">
      <header className="mx-auto w-full max-w-6xl px-6 py-6">
        <Link to="/"><Logo /></Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft"
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Start getting smart local picks." : "Log in to continue."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            )}
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-gradient-hero shadow-soft hover:opacity-95">
              {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Needly?"}{" "}
            <button
              onClick={() => setParams({ mode: mode === "signup" ? "login" : "signup" })}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;