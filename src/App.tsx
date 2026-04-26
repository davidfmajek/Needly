import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Onboarding from "./pages/onboarding/Profile";
import Dashboard from "./pages/Dashboard";
import Saved from "./pages/Saved";
import MyDay from "./pages/MyDay";
import CalendarCallback from "./pages/CalendarCallback";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { ProtectedRoute } from "./components/needly/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "!rounded-xl !border-border !bg-card !text-card-foreground !shadow-soft",
        }}
      />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/my-day" element={<ProtectedRoute><MyDay /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
            <Route path="/auth/calendar-callback" element={<ProtectedRoute><CalendarCallback /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
