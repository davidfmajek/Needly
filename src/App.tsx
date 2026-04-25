import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Profile from "./pages/onboarding/Profile.tsx";
import LocationStep from "./pages/onboarding/Location.tsx";
import Schedule from "./pages/onboarding/Schedule.tsx";
import Context from "./pages/onboarding/Context.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Saved from "./pages/Saved.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";
import { ProtectedRoute } from "./components/needly/ProtectedRoute.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/onboarding/location" element={<ProtectedRoute><LocationStep /></ProtectedRoute>} />
            <Route path="/onboarding/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
            <Route path="/onboarding/context" element={<ProtectedRoute><Context /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
