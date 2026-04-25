import { motion } from "framer-motion";
import { Logo } from "./Logo";

export const OnboardingShell = ({
  step,
  total,
  title,
  subtitle,
  children,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-soft">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Logo />
        <span className="text-xs text-muted-foreground">Step {step} of {total}</span>
      </header>
      <div className="mx-auto h-1 w-full max-w-3xl px-6">
        <div className="h-1 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full bg-gradient-hero"
            initial={{ width: 0 }}
            animate={{ width: `${(step / total) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>
    </div>
  );
};