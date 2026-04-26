import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Logo } from "@/components/needly/Logo";
import { ThemeToggle } from "@/components/needly/ThemeToggle";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = `${mode === "signup" ? "Sign up" : "Log in"} · Needly`; }, [mode]);
  useEffect(() => { if (user) navigate("/dashboard", { replace: true }); }, [user, navigate]);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const sLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const sColor = ["", "bg-destructive", "bg-amber-500", "bg-emerald-400", "bg-emerald-500"][strength];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/onboarding` } });
        if (error) throw error;
        toast.success("Account created!"); navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!"); navigate("/dashboard");
      }
    } catch (err: any) { toast.error(err.message ?? "Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-soft">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-glow">
            <h1 className="text-2xl font-bold tracking-tight">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{mode === "signup" ? "Start getting smart local picks." : "Log in to continue."}</p>
            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} required minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth" tabIndex={-1}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
                {mode === "signup" && password.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                    <div className="flex gap-1">{[1, 2, 3, 4].map((l) => (<div key={l} className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength >= l ? sColor : "bg-muted"}`} />))}</div>
                    <p className="text-xs text-muted-foreground">{sLabel}</p>
                  </motion.div>
                )}
              </div>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" required minLength={6} placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
              )}
              <Button type="submit" loading={loading} className="h-12 w-full shadow-soft">{loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}</Button>
            </form>
            <p className="mt-7 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "New to Needly?"}{" "}
              <button onClick={() => setParams({ mode: mode === "signup" ? "login" : "signup" })} className="font-semibold text-primary hover:underline">{mode === "signup" ? "Log in" : "Sign up"}</button>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
