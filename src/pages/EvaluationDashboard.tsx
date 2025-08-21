import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { StartupsEvaluationList } from "@/components/evaluation/StartupsEvaluationList";
import { EvaluationStats } from "@/components/evaluation/EvaluationStats";
import { Search, Filter, CheckCircle, Clock, AlertCircle } from "lucide-react";
interface AssignedStartup {
  id: string;
  name: string;
  description: string;
  industry: string;
  stage: string;
  founded_year: number;
  team_size: number;
  funding_raised: number;
  contact_email: string;
  website: string;
  pitch_deck_url: string;
  demo_url: string;
  location: string;
  evaluation_status: 'not_started' | 'draft' | 'completed';
  evaluation_id?: string;
  overall_score?: number;
}
const EvaluationDashboard = () => {
  const {
    user
  } = useAuth();
  const {
    profile
  } = useUserProfile();
  const [assignedStartups, setAssignedStartups] = useState<AssignedStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_started' | 'draft' | 'completed'>('all');
  useEffect(() => {
    if (user && profile?.role === 'vc') {
      fetchAssignedStartups();
    }
  }, [user, profile]);
  const fetchAssignedStartups = async () => {
    try {
      setLoading(true);

      // First, find the juror record for this authenticated user
      const { data: juror, error: jurorError } = await supabase
        .from('jurors')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (jurorError) throw jurorError;
      
      if (!juror) {
        console.warn('No juror record found for this user');
        setAssignedStartups([]);
        return;
      }

      // Fetch startups assigned to this juror
      const {
        data: assignments,
        error: assignmentsError
      } = await supabase.from('startup_assignments').select(`
          startup_id,
          startups (
            id,
            name,
            description,
            industry,
            stage,
            founded_year,
            team_size,
            funding_raised,
            contact_email,
            website,
            pitch_deck_url,
            demo_url,
            location
          )
        `).eq('juror_id', juror.id).eq('status', 'assigned');
      if (assignmentsError) throw assignmentsError;

      // Fetch existing evaluations for these startups
      const startupIds = assignments?.map(a => a.startup_id) || [];
      const {
        data: evaluations,
        error: evaluationsError
      } = await supabase.from('evaluations').select('*').eq('evaluator_id', user?.id).in('startup_id', startupIds);
      if (evaluationsError) throw evaluationsError;

      // Combine data
      const startupsWithEvaluations: AssignedStartup[] = assignments?.map(assignment => {
        const startup = assignment.startups;
        const evaluation = evaluations?.find(e => e.startup_id === startup.id);
        let evaluation_status: 'not_started' | 'draft' | 'completed' = 'not_started';
        if (evaluation) {
          evaluation_status = evaluation.status === 'submitted' ? 'completed' : 'draft';
        }
        return {
          id: startup.id,
          name: startup.name,
          description: startup.description || '',
          industry: startup.industry || '',
          stage: startup.stage || '',
          founded_year: startup.founded_year || 0,
          team_size: startup.team_size || 0,
          funding_raised: startup.funding_raised || 0,
          contact_email: startup.contact_email || '',
          website: startup.website || '',
          pitch_deck_url: startup.pitch_deck_url || '',
          demo_url: startup.demo_url || '',
          location: startup.location || '',
          evaluation_status,
          evaluation_id: evaluation?.id,
          overall_score: evaluation?.overall_score
        };
      }) || [];
      setAssignedStartups(startupsWithEvaluations);
    } catch (error) {
      console.error('Error fetching assigned startups:', error);
      toast.error('Failed to load assigned startups');
    } finally {
      setLoading(false);
    }
  };
  const filteredStartups = assignedStartups.filter(startup => {
    const matchesSearch = startup.name.toLowerCase().includes(searchTerm.toLowerCase()) || startup.industry.toLowerCase().includes(searchTerm.toLowerCase()) || startup.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || startup.evaluation_status === filterStatus;
    return matchesSearch && matchesFilter;
  });
  const stats = {
    total: assignedStartups.length,
    completed: assignedStartups.filter(s => s.evaluation_status === 'completed').length,
    draft: assignedStartups.filter(s => s.evaluation_status === 'draft').length,
    notStarted: assignedStartups.filter(s => s.evaluation_status === 'not_started').length,
    averageScore: assignedStartups.filter(s => s.overall_score).reduce((sum, s) => sum + (s.overall_score || 0), 0) / assignedStartups.filter(s => s.overall_score).length || 0
  };
  const completionRate = stats.total > 0 ? stats.completed / stats.total * 100 : 0;
  if (profile?.role !== 'vc') {
    return <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                This page is only accessible to VC Partners (Jurors). Please contact your administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Evaluations</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Review and evaluate the startups assigned to you
          </p>
          
          {/* Progress Overview */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Evaluation Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.completed} of {stats.total} evaluations completed
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{completionRate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>
              <Progress value={completionRate} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <EvaluationStats stats={stats} />

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search startups by name, industry, or description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')} className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  All ({stats.total})
                </Button>
                <Button variant={filterStatus === 'not_started' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('not_started')} className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Not Started ({stats.notStarted})
                </Button>
                <Button variant={filterStatus === 'draft' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('draft')} className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-4 h-4" />
                  Draft ({stats.draft})
                </Button>
                <Button variant={filterStatus === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('completed')} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Completed ({stats.completed})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Startups List */}
        <StartupsEvaluationList startups={filteredStartups} loading={loading} onEvaluationUpdate={fetchAssignedStartups} />
      </main>
    </div>;
};
export default EvaluationDashboard;