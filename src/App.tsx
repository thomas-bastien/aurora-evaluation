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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import TestSignup from "./pages/TestSignup";
import JurorOnboarding from "./pages/JurorOnboarding";
import Dashboard from "./pages/Dashboard";
import StartupProfile from "./pages/StartupProfile";
import StartupsList from "./pages/StartupsList";
import VCProfile from "./pages/VCProfile";
import VCsList from "./pages/VCsList";
import JurorsList from "./pages/JurorsList";
import JurorProfile from "./pages/JurorProfile";
import Selection from "./pages/Selection";
import SelectionMatchmaking from "./pages/SelectionMatchmaking";
import SessionManagement from "./pages/SessionManagement";
import EvaluationDashboard from "./pages/EvaluationDashboard";
import Matchmaking from "./pages/Matchmaking";
import CohortSettings from "./pages/CohortSettings";
import DemoSelection from "./pages/DemoSelection";
import EmailManagementPage from "./pages/EmailManagement";
import NotFound from "./pages/NotFound";
import { DemoProvider } from "@/contexts/DemoContext";

const queryClient = new QueryClient();

// Component to properly redirect from /admin and legacy routes to /selection
const AdminRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/screening/applications') {
      console.log('AdminRedirect: Redirecting to /selection?round=screening&tab=startup-selection');
      navigate('/selection?round=screening&tab=startup-selection', { replace: true });
    } else {
      console.log('AdminRedirect: Redirecting to /selection?round=screening');
      navigate('/selection?round=screening', { replace: true });
    }
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
      <p>The page has been moved to Selection.</p>
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/demo/*" element={
              <DemoProvider>
                <Routes>
                  <Route path="/" element={<DemoSelection />} />
                  <Route path="admin/dashboard" element={<Dashboard />} />
                  <Route path="vc/dashboard" element={<Dashboard />} />
                </Routes>
              </DemoProvider>
            } />
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
            <Route path="/juror/:id" element={
              <ProtectedRoute>
                <JurorProfile />
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
                <RoleGuard allowedRoles={['admin']}>
                  <Selection />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/selection/matchmaking" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['admin']} fallbackRoute="/dashboard">
                  <SelectionMatchmaking />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/evaluate" element={
              <ProtectedRoute>
                <EvaluationDashboard />
              </ProtectedRoute>
            } />
            <Route path="/session-management" element={
              <ProtectedRoute>
                <SessionManagement />
              </ProtectedRoute>
            } />
            <Route path="/matchmaking" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <Matchmaking />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/cohort-settings" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <CohortSettings />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/email-management" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <EmailManagementPage />
                </RoleGuard>
              </ProtectedRoute>
            } />
            {/* Redirect legacy routes */}
            <Route path="/screening/applications" element={
              <ProtectedRoute>
                <AdminRedirect />
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
