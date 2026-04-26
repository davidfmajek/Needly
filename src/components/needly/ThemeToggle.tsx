import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

export const ThemeToggle = () => {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-transparent transition-smooth hover:bg-accent"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Moon className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Sun className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};