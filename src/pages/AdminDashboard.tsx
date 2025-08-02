import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [overallStats, setOverallStats] = useState({
    totalStartups: 0,
    totalVCs: 0,
    completedEvaluations: 0,
    totalEvaluations: 0,
    avgScore: 0,
    sessionsCompleted: 0,
    totalSessions: 0
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [vcProfiles, setVcProfiles] = useState<any[]>([]);
  const [topStartups, setTopStartups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch startups count
        const { count: startupsCount } = await supabase
          .from('startups')
          .select('*', { count: 'exact', head: true });

        // Fetch VCs count
        const { count: vcsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'vc');

        // Fetch evaluations count
        const { count: evaluationsCount } = await supabase
          .from('evaluations')
          .select('*', { count: 'exact', head: true });

        // Fetch sessions
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('*')
          .order('scheduled_date', { ascending: true });

        // Fetch VC profiles with evaluation counts
        const { data: vcData } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'vc');

        // Fetch top startups with scores
        const { data: startupsData } = await supabase
          .from('startups')
          .select(`
            *,
            evaluations!inner(overall_score)
          `)
          .limit(5);

        setOverallStats({
          totalStartups: startupsCount || 0,
          totalVCs: vcsCount || 0,
          completedEvaluations: evaluationsCount || 0,
          totalEvaluations: (startupsCount || 0) * (vcsCount || 0),
          avgScore: 7.8,
          sessionsCompleted: sessionsData?.filter(s => s.status === 'completed').length || 0,
          totalSessions: sessionsData?.length || 0
        });

        setSessions(sessionsData || []);
        setVcProfiles(vcData || []);
        setTopStartups(startupsData || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

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
                  {vcProfiles.map((vc, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{vc.full_name || 'Unknown VC'}</h4>
                          <p className="text-sm text-muted-foreground">{vc.organization || 'No organization'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">Avg Score: N/A</p>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={75} className="flex-1" />
                        <span className="text-sm font-medium">-/-</span>
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
                  {sessions.map((session, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{session.name}</h4>
                          <p className="text-sm text-muted-foreground">{session.category}</p>
                        </div>
                        <Badge variant={getStatusColor(session.status)}>{session.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={session.completion_rate || 0} className="flex-1" />
                        <span className="text-sm font-medium">{session.vc_participants} VCs</span>
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
                          <p className="text-sm text-muted-foreground">{startup.industry}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">N/A</p>
                            <p className="text-xs text-muted-foreground">0 evaluations</p>
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