import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StartupProfile = lazy(() => import("./pages/StartupProfile"));
const StartupsList = lazy(() => import("./pages/StartupsList"));
const VCProfile = lazy(() => import("./pages/VCProfile"));
const VCsList = lazy(() => import("./pages/VCsList"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SessionManagement = lazy(() => import("./pages/SessionManagement"));
const EvaluationDashboard = lazy(() => import("./pages/EvaluationDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageSkeleton = () => (
  <div className="container mx-auto py-8 space-y-6">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

// Optimized React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce background refetches to improve performance
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
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
              <Route path="/vc/:id" element={
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
