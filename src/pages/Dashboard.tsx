import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EvaluationProgress } from "@/components/dashboard/EvaluationProgress";
import { StartupList } from "@/components/dashboard/StartupList";
import { 
  Building2, 
  Star, 
  TrendingUp, 
  Users, 
  Calendar,
  BarChart3 
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Total Startups",
      value: "100",
      subtitle: "Longlisted applications",
      icon: Building2,
      trend: "up" as const,
      trendValue: "+12% from last season"
    },
    {
      title: "Completed Evaluations", 
      value: "67",
      subtitle: "Out of 100 startups",
      icon: Star,
      trend: "up" as const,
      trendValue: "67% complete"
    },
    {
      title: "Average Score",
      value: "78.5",
      subtitle: "Evaluation average",
      icon: TrendingUp,
      trend: "up" as const,
      trendValue: "+3.2 points"
    },
    {
      title: "Active Reviewers",
      value: "8",
      subtitle: "VC partners engaged",
      icon: Users,
      trend: "neutral" as const,
      trendValue: "All partners active"
    },
    {
      title: "Scheduled Pitches",
      value: "12",
      subtitle: "For final 30 selection",
      icon: Calendar,
      trend: "up" as const,
      trendValue: "+5 this week"
    },
    {
      title: "Progress Rate",
      value: "94%",
      subtitle: "On schedule completion",
      icon: BarChart3,
      trend: "up" as const,
      trendValue: "Ahead of timeline"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back to Aurora Evaluation
          </h2>
          <p className="text-lg text-muted-foreground">
            Manage your startup evaluation pipeline with comprehensive insights and streamlined workflows.
          </p>
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
              <button className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-smooth text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Start New Evaluation</h4>
                    <p className="text-sm text-muted-foreground">Begin reviewing pending startups</p>
                  </div>
                </div>
              </button>
              
              <button className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-smooth text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Schedule Pitch Session</h4>
                    <p className="text-sm text-muted-foreground">Coordinate final presentations</p>
                  </div>
                </div>
              </button>
              
              <button className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-smooth text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Generate Report</h4>
                    <p className="text-sm text-muted-foreground">Export evaluation analytics</p>
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