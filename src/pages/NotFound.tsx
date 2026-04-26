import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Sparkles } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Animated 404 */}
        <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20"
          />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent shadow-soft"
          >
            <Sparkles className="h-8 w-8 text-primary" />
          </motion.div>
        </div>

        <h1 className="text-6xl font-extrabold tracking-tight text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          This page doesn't exist — yet.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
