import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Bookmark, Home, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const NavBtn = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
          active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/dashboard"><Logo /></Link>
        <nav className="flex items-center gap-1">
          <NavBtn to="/dashboard" icon={Home} label="Dashboard" />
          <NavBtn to="/saved" icon={Bookmark} label="Saved" />
          <Button variant="ghost" size="sm" onClick={logout} className="ml-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">{children}</main>
    </div>
  );
};