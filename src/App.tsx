import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StartupProfile from "./pages/StartupProfile";
import StartupsList from "./pages/StartupsList";
import VCProfile from "./pages/VCProfile";
import VCsList from "./pages/VCsList";
import JurorsList from "./pages/JurorsList";
import AdminDashboard from "./pages/AdminDashboard";
import SessionManagement from "./pages/SessionManagement";
import EvaluationDashboard from "./pages/EvaluationDashboard";
import Matchmaking from "./pages/Matchmaking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/startups" element={
              <ProtectedRoute>
                <StartupsList />
              </ProtectedRoute>
            } />
            <Route path="/startup/:id" element={
              <ProtectedRoute>
                <StartupProfile />
              </ProtectedRoute>
            } />
            <Route path="/vcs" element={
              <ProtectedRoute>
                <VCsList />
              </ProtectedRoute>
            } />
            <Route path="/jurors" element={
              <ProtectedRoute>
                <JurorsList />
              </ProtectedRoute>
            } />
            <Route path="/vc/:id" element={
              <ProtectedRoute>
                <VCProfile />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <VCProfile />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/sessions" element={
              <ProtectedRoute>
                <SessionManagement />
              </ProtectedRoute>
            } />
            <Route path="/evaluate" element={
              <ProtectedRoute>
                <EvaluationDashboard />
              </ProtectedRoute>
            } />
            <Route path="/matchmaking" element={
              <ProtectedRoute>
                <Matchmaking />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
