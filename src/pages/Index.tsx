import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/needly/Logo";
import { MapPin, Sparkles, Bookmark, Compass } from "lucide-react";

const steps = [
  { icon: Sparkles, title: "Tell Needly about your routine", desc: "A quick profile so we understand your week." },
  { icon: Compass, title: "Tell it what you need right now", desc: "Heading to class, lunch break, gym session..." },
  { icon: MapPin, title: "Get the best spots nearby", desc: "Personalized picks based on context and location." },
  { icon: Bookmark, title: "Save your favorites", desc: "Build a library of places that fit your life." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Link to="/auth?mode=login">
          <Button variant="ghost">Log In</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3 w-3 text-primary" /> AI local need predictor
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-6xl">
            Your day already has<br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">enough decisions.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Needly predicts what you need next and finds the best places nearby based on your routine, location, and preferences.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground/80">
            Heading to class? Going to the gym? Feeling tired? Needly helps you decide what to do next.
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-10 inline-block">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="h-12 rounded-full bg-gradient-hero px-8 text-base shadow-glow hover:opacity-95">
                Get Started
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-28">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-border bg-card p-6 text-left shadow-soft"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{i + 1}. {s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
