import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import OnboardingRedirect from "@/components/OnboardingRedirect";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TestSignup from "./pages/TestSignup";
import JurorOnboarding from "./pages/JurorOnboarding";
import Dashboard from "./pages/Dashboard";
import StartupProfile from "./pages/StartupProfile";
import StartupsList from "./pages/StartupsList";
import VCProfile from "./pages/VCProfile";
import VCsList from "./pages/VCsList";
import JurorsList from "./pages/JurorsList";
import Selection from "./pages/Selection";
import SessionManagement from "./pages/SessionManagement";
import EvaluationDashboard from "./pages/EvaluationDashboard";
import Matchmaking from "./pages/Matchmaking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to properly redirect from /admin to /selection
const AdminRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('AdminRedirect: Redirecting to /selection?phase=screening');
    navigate('/selection?phase=screening', { replace: true });
  }, [navigate]);
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      flexDirection: 'column' 
    }}>
      <h2>Redirecting...</h2>
      <p>The Admin page has been moved to Selection.</p>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OnboardingRedirect>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/juror-onboarding" element={
              <ProtectedRoute>
                <JurorOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/test-signup" element={<TestSignup />} />
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
                <AdminRedirect />
              </ProtectedRoute>
            } />
            <Route path="/selection" element={
              <ProtectedRoute>
                <Selection />
              </ProtectedRoute>
            } />
            <Route path="/evaluate" element={
              <ProtectedRoute>
                <EvaluationDashboard />
              </ProtectedRoute>
            } />
            <Route path="/matchmaking" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <Matchmaking />
                </RoleGuard>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </OnboardingRedirect>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
