import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/needly/Logo";
import { ThemeToggle } from "@/components/needly/ThemeToggle";
import { MapPin, Sparkles, Bookmark, Compass, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Sparkles,
    title: "Tell Needly about your routine",
    desc: "A quick profile so we understand your week.",
    color: "from-emerald-500/20 to-teal-500/10",
  },
  {
    icon: Compass,
    title: "Tell it what you need right now",
    desc: "Heading to class, lunch break, gym session...",
    color: "from-blue-500/20 to-indigo-500/10",
  },
  {
    icon: MapPin,
    title: "Get the best spots nearby",
    desc: "Personalized picks based on context and location.",
    color: "from-violet-500/20 to-purple-500/10",
  },
  {
    icon: Bookmark,
    title: "Save your favorites",
    desc: "Build a library of places that fit your life.",
    color: "from-amber-500/20 to-orange-500/10",
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth?mode=login">
            <Button variant="ghost" size="sm">Log In</Button>
          </Link>
          <Link to="/auth?mode=signup" className="hidden sm:block">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Badge */}
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3 w-3 text-primary" />
            AI local need predictor
          </span>

          {/* Heading */}
          <h1 className="mt-8 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Your day already has
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">enough decisions.</span>
          </h1>

          {/* Subhead */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Needly predicts what you need next and finds the best places nearby — based on your routine, location, and preferences.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground/70">
            Heading to class? Going to the gym? Feeling tired? Needly helps you decide what to do next.
          </p>

          {/* CTA */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="mt-10 inline-block"
          >
            <Link to="/auth?mode=signup">
              <Button
                size="lg"
                className="h-14 rounded-full px-10 text-base shadow-glow animate-pulse-glow"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* How it works */}
        <motion.section
          className="mt-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 text-left shadow-soft transition-shadow hover:shadow-glow"
              >
                {/* Gradient blob */}
                <div
                  className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${s.color} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`}
                />

                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold">
                    <span className="text-primary">{i + 1}.</span> {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Needly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
