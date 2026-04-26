import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("needly-theme") as Theme | null;
  if (stored) return stored;
  // Respect system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("needly-theme", theme);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("needly-theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const nextTheme: Theme = theme === "light" ? "dark" : "light";

    // When the View Transitions API is available, ride its built-in
    // crossfade so the entire document smoothly morphs between palettes.
    // Otherwise fall back to a brief opt-in opacity fade applied via a
    // class on <html> (see theme transition CSS).
    const docVT = document as DocumentWithViewTransition;
    if (typeof docVT.startViewTransition === "function") {
      root.classList.add("theme-transitioning");
      const transition = docVT.startViewTransition(() => {
        setTheme(nextTheme);
      });
      transition.finished.finally(() => {
        root.classList.remove("theme-transitioning");
      });
      return;
    }

    root.classList.add("theme-transitioning");
    window.setTimeout(() => root.classList.remove("theme-transitioning"), 800);
    setTheme(nextTheme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
