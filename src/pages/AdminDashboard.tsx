import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Building2, 
  Calendar, 
  BarChart3, 
  Clock, 
  CheckCircle,
  AlertCircle,
  FileText,
  Settings,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { JurorProgressMonitoring } from "@/components/cm/JurorProgressMonitoring";
import { StartupSelection } from "@/components/cm/StartupSelection";
import { ResultsCommunication } from "@/components/cm/ResultsCommunication";
import { ReportingDocumentation } from "@/components/cm/ReportingDocumentation";

const AdminDashboard = () => {
  const [currentPhase, setCurrentPhase] = useState<'phase1' | 'phase2'>('phase1');
  const [overallStats, setOverallStats] = useState({
    totalStartups: 0,
    totalVCs: 0,
    completedEvaluations: 0,
    totalEvaluations: 0,
    avgScore: 0,
    sessionsCompleted: 0,
    totalSessions: 0
  });
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

        setOverallStats({
          totalStartups: startupsCount || 0,
          totalVCs: vcsCount || 0,
          completedEvaluations: evaluationsCount || 0,
          totalEvaluations: (startupsCount || 0) * (vcsCount || 0),
          avgScore: 7.8,
          sessionsCompleted: 0,
          totalSessions: 0
        });
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
        {/* Header with Phase Toggle */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
              <p className="text-lg text-muted-foreground">
                Complete oversight of the evaluation process and progress tracking
              </p>
            </div>
            
            {/* Global Phase Toggle */}
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="phase-toggle" className="text-sm font-medium">
                  Current Phase:
                </Label>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${currentPhase === 'phase1' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    Phase 1
                  </span>
                  <Switch
                    id="phase-toggle"
                    checked={currentPhase === 'phase2'}
                    onCheckedChange={(checked) => setCurrentPhase(checked ? 'phase2' : 'phase1')}
                  />
                  <span className={`text-sm ${currentPhase === 'phase2' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    Phase 2
                  </span>
                </div>
                <Badge variant={currentPhase === 'phase1' ? 'secondary' : 'default'}>
                  {currentPhase === 'phase1' ? 'Evaluations' : 'Pitches'}
                </Badge>
              </div>
            </Card>
          </div>
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

        <Tabs defaultValue="juror-progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="juror-progress">Juror Progress</TabsTrigger>
            <TabsTrigger value="startup-selection">Startup Selection</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="reports">Reporting & Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="juror-progress" className="space-y-6">
            <JurorProgressMonitoring currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="startup-selection" className="space-y-6">
            <StartupSelection currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <ResultsCommunication currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportingDocumentation currentPhase={currentPhase} />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;