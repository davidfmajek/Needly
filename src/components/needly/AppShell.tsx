import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { Bookmark, CalendarDays, Home, LogOut, Menu, X, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsDrawer } from "./SettingsDrawer";

const NAV_ITEMS = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/my-day", icon: CalendarDays, label: "My Day" },
  { to: "/saved", icon: Bookmark, label: "Saved" },
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-smooth ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-accent -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="text-muted-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>

          {/* Mobile menu toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent transition-smooth"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-border md:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                  const active = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-smooth ${
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { setMobileOpen(false); setSettingsOpen(true); }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-smooth"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={() => { setMobileOpen(false); signOut(); }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-smooth"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8 pb-16">{children}</main>

      {/* Settings drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};