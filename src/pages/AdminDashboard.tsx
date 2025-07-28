import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Building2, 
  Calendar, 
  BarChart3, 
  Clock, 
  CheckCircle,
  AlertCircle,
  FileText,
  Settings
} from "lucide-react";

const AdminDashboard = () => {
  // Mock data - would come from API/database
  const overallStats = {
    totalStartups: 100,
    totalVCs: 12,
    completedEvaluations: 856,
    totalEvaluations: 1200,
    avgScore: 7.8,
    sessionsCompleted: 15,
    totalSessions: 20
  };

  const vcProgress = [
    { name: "Alex Thompson", firm: "Sequoia Capital", completed: 18, total: 20, avgScore: 7.8, status: "Active" },
    { name: "Maria Rodriguez", firm: "Andreessen Horowitz", completed: 20, total: 20, avgScore: 8.2, status: "Completed" },
    { name: "David Kim", firm: "Bessemer Venture", completed: 15, total: 20, avgScore: 7.5, status: "Active" },
    { name: "Sarah Johnson", firm: "Index Ventures", completed: 19, total: 20, avgScore: 8.0, status: "Active" },
    { name: "Michael Chen", firm: "Accel Partners", completed: 12, total: 20, avgScore: 7.3, status: "Behind" }
  ];

  const sessionProgress = [
    { name: "Session 1: AI & ML Startups", startups: 5, vcCompleted: 12, vcTotal: 12, status: "Completed" },
    { name: "Session 2: Fintech Solutions", startups: 6, vcCompleted: 12, vcTotal: 12, status: "Completed" },
    { name: "Session 3: Healthcare Tech", startups: 4, vcCompleted: 11, vcTotal: 12, status: "In Progress" },
    { name: "Session 4: Enterprise SaaS", startups: 6, vcCompleted: 8, vcTotal: 12, status: "In Progress" },
    { name: "Session 5: Consumer Apps", startups: 5, vcCompleted: 0, vcTotal: 12, status: "Scheduled" }
  ];

  const topStartups = [
    { name: "TechFlow AI", category: "AI/ML", avgScore: 8.9, evaluations: 12, status: "Advancing" },
    { name: "FinSecure", category: "Fintech", avgScore: 8.7, evaluations: 12, status: "Advancing" },
    { name: "HealthSync", category: "HealthTech", avgScore: 8.5, evaluations: 11, status: "Advancing" },
    { name: "DataSync Pro", category: "SaaS", avgScore: 8.3, evaluations: 10, status: "Under Review" },
    { name: "CloudOps", category: "DevOps", avgScore: 8.1, evaluations: 12, status: "Under Review" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "default";
      case "Active": return "secondary";
      case "Behind": return "destructive";
      case "In Progress": return "secondary";
      case "Scheduled": return "outline";
      case "Advancing": return "default";
      case "Under Review": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Complete oversight of the evaluation process and progress tracking
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Startups</p>
                  <p className="text-2xl font-bold text-foreground">{overallStats.totalStartups}</p>
                </div>
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">VC Partners</p>
                  <p className="text-2xl font-bold text-foreground">{overallStats.totalVCs}</p>
                </div>
                <Users className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Evaluation Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round((overallStats.completedEvaluations / overallStats.totalEvaluations) * 100)}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                  <p className="text-2xl font-bold text-foreground">{overallStats.avgScore}/10</p>
                </div>
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="progress">VC Progress</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="startups">Top Startups</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>VC Evaluation Progress</CardTitle>
                <CardDescription>Track individual VC partner progress and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vcProgress.map((vc, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{vc.name}</h4>
                          <p className="text-sm text-muted-foreground">{vc.firm}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">Avg Score: {vc.avgScore}/10</p>
                          </div>
                          <Badge variant={getStatusColor(vc.status)}>{vc.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={(vc.completed / vc.total) * 100} className="flex-1" />
                        <span className="text-sm font-medium">{vc.completed}/{vc.total}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">View Details</Button>
                        <Button size="sm" variant="outline">Send Reminder</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>Monitor and manage evaluation sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionProgress.map((session, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{session.name}</h4>
                          <p className="text-sm text-muted-foreground">{session.startups} startups</p>
                        </div>
                        <Badge variant={getStatusColor(session.status)}>{session.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={(session.vcCompleted / session.vcTotal) * 100} className="flex-1" />
                        <span className="text-sm font-medium">{session.vcCompleted}/{session.vcTotal} VCs</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Manage Session</Button>
                        <Button size="sm" variant="outline">View Results</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="startups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Startups</CardTitle>
                <CardDescription>Highest scoring startups in the evaluation process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topStartups.map((startup, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{startup.name}</h4>
                          <p className="text-sm text-muted-foreground">{startup.category}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{startup.avgScore}/10</p>
                            <p className="text-xs text-muted-foreground">{startup.evaluations} evaluations</p>
                          </div>
                          <Badge variant={getStatusColor(startup.status)}>{startup.status}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">View Profile</Button>
                        <Button size="sm" variant="outline">Schedule Pitch</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Evaluation Summary
                  </CardTitle>
                  <CardDescription>Complete evaluation results and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Generate Report</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    VC Performance
                  </CardTitle>
                  <CardDescription>Individual VC scoring patterns and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Export Data</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Session Reports
                  </CardTitle>
                  <CardDescription>Detailed session-by-session breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">View Sessions</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;