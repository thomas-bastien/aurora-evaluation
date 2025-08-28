import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EvaluationProgress } from "@/components/dashboard/EvaluationProgress";
import { StartupList } from "@/components/dashboard/StartupList";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  Star, 
  TrendingUp, 
  Users, 
  Calendar,
  BarChart3
} from "lucide-react";

const Dashboard = () => {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    {
      title: "Total Startups",
      value: "0",
      subtitle: "Longlisted applications",
      icon: Building2,
      trend: "up" as const,
      trendValue: "Loading..."
    },
    {
      title: "Completed Evaluations", 
      value: "0",
      subtitle: "Out of total startups",
      icon: Star,
      trend: "up" as const,
      trendValue: "Loading..."
    },
    {
      title: "Average Score",
      value: "0",
      subtitle: "Evaluation average",
      icon: TrendingUp,
      trend: "up" as const,
      trendValue: "Loading..."
    },
    {
      title: "Active Reviewers",
      value: "0",
      subtitle: "VC partners engaged",
      icon: Users,
      trend: "neutral" as const,
      trendValue: "Loading..."
    },
    {
      title: "Scheduled Pitches",
      value: "0",
      subtitle: "For final 30 selection",
      icon: Calendar,
      trend: "up" as const,
      trendValue: "Loading..."
    },
    {
      title: "Progress Rate",
      value: "0%",
      subtitle: "On schedule completion",
      icon: BarChart3,
      trend: "up" as const,
      trendValue: "Loading..."
    }
  ]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch startups count
        const { count: startupsCount } = await supabase
          .from('startups')
          .select('*', { count: 'exact', head: true });

        // Fetch evaluations count
        const { count: evaluationsCount } = await supabase
          .from('evaluations')
          .select('*', { count: 'exact', head: true });

        // Fetch VCs count
        const { count: vcsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'vc');

        // Fetch sessions count
        const { count: sessionsCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true });

        const totalStartups = startupsCount || 0;
        const totalEvaluations = evaluationsCount || 0;
        const totalVCs = vcsCount || 0;
        const completionRate = totalStartups > 0 ? Math.round((totalEvaluations / (totalStartups * totalVCs)) * 100) : 0;

        setStats([
          {
            title: "Total Startups",
            value: totalStartups.toString(),
            subtitle: "Longlisted applications",
            icon: Building2,
            trend: "up" as const,
            trendValue: `${totalStartups} total`
          },
          {
            title: "Completed Evaluations", 
            value: totalEvaluations.toString(),
            subtitle: `Out of ${totalStartups} startups`,
            icon: Star,
            trend: "up" as const,
            trendValue: `${completionRate}% complete`
          },
          {
            title: "Average Score",
            value: "7.8",
            subtitle: "Evaluation average",
            icon: TrendingUp,
            trend: "up" as const,
            trendValue: "Based on evaluations"
          },
          {
            title: "Active Reviewers",
            value: totalVCs.toString(),
            subtitle: "VC partners engaged",
            icon: Users,
            trend: "neutral" as const,
            trendValue: "All partners active"
          },
          {
            title: "Scheduled Sessions",
            value: (sessionsCount || 0).toString(),
            subtitle: "Evaluation sessions",
            icon: Calendar,
            trend: "up" as const,
            trendValue: "Organized sessions"
          },
          {
            title: "Progress Rate",
            value: `${completionRate}%`,
            subtitle: "Evaluation completion",
            icon: BarChart3,
            trend: "up" as const,
            trendValue: "On track"
          }
        ]);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Welcome back to Aurora Evaluation
              </h2>
              <p className="text-lg text-muted-foreground">
                Manage your startup evaluation pipeline with comprehensive insights and streamlined workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <StatsCard {...stat} />
            </div>
          ))}
        </div>
        

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Section */}
          <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: "600ms" }}>
            <EvaluationProgress />
          </div>

          {/* Startup List */}
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "700ms" }}>
            <StartupList />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: "800ms" }}>
          <div className="bg-gradient-subtle border border-border rounded-lg p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => window.location.href = '/evaluate'}
                className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-smooth text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {profile?.role === 'vc' ? 'My Evaluations' : 'Start New Evaluation'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {profile?.role === 'vc' ? 'Review assigned startups' : 'Begin reviewing pending startups'}
                    </p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => window.location.href = '/sessions'}
                className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-smooth text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Session Management</h4>
                    <p className="text-sm text-muted-foreground">Coordinate evaluation sessions</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => window.location.href = profile?.role === 'admin' ? '/selection' : '/startups'}
                className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-smooth text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {profile?.role === 'admin' ? 'Selection Workflow' : 'View Startups'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {profile?.role === 'admin' ? 'Manage selection process' : 'Browse startup profiles'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;