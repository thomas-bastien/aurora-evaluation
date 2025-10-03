import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "react-router-dom";
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
import { WorkflowGuide } from "@/components/common/WorkflowGuide";
import { Search, Filter, CheckCircle, Clock, AlertCircle } from "lucide-react";
interface AssignedStartup {
  id: string;
  name: string;
  description: string;
  verticalsText: string;
  stage: string;
  contact_email: string;
  website: string;
  pitch_deck_url: string;
  demo_url: string;
  location: string;
  region: string;
  country: string;
  linkedin_url: string;
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
  const [searchParams] = useSearchParams();
  const currentRound = searchParams.get('round') as 'screening' | 'pitching' || 'screening';
  const [assignedStartups, setAssignedStartups] = useState<AssignedStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_started' | 'draft' | 'completed'>('all');
  useEffect(() => {
    if (user && profile?.role === 'vc') {
      fetchAssignedStartups();
    }
  }, [user, profile, currentRound]);
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

      // Determine which tables to use based on current round
      const assignmentsTable = currentRound === 'screening' ? 'screening_assignments' : 'pitching_assignments';
      const evaluationsTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';

      // Fetch startups assigned to this juror for the current round
      const { data: assignments, error: assignmentsError } = await supabase
        .from(assignmentsTable)
        .select(`
          startup_id,
          startups (
            id,
            name,
            description,
            industry,
            stage,
            contact_email,
            website,
            pitch_deck_url,
            demo_url,
            location,
            region,
            country,
            linkedin_url
          )
        `)
        .eq('juror_id', juror.id);

      if (assignmentsError) throw assignmentsError;

      // Fetch existing evaluations for these startups from the current round
      const startupIds = assignments?.map(a => a.startup_id) || [];
      let evaluations = [];
      
      if (startupIds.length > 0) {
        const { data: roundEvaluations, error: evaluationsError } = await supabase
          .from(evaluationsTable)
          .select('*')
          .eq('evaluator_id', user?.id)
          .in('startup_id', startupIds);
          
        if (evaluationsError) throw evaluationsError;
        evaluations = roundEvaluations || [];
      }

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
          verticalsText: Array.isArray(startup.verticals) ? startup.verticals.join(', ') : '',
          stage: startup.stage || '',
          contact_email: startup.contact_email || '',
          website: startup.website || '',
          pitch_deck_url: startup.pitch_deck_url || '',
          demo_url: startup.demo_url || '',
          location: startup.location || '',
          region: startup.region || '',
          country: startup.country || '',
          linkedin_url: startup.linkedin_url || '',
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
    const matchesSearch = startup.name.toLowerCase().includes(searchTerm.toLowerCase()) || startup.verticalsText.toLowerCase().includes(searchTerm.toLowerCase()) || startup.description.toLowerCase().includes(searchTerm.toLowerCase());
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
        {/* Workflow Guide */}
        <WorkflowGuide userRole="vc" currentRound={currentRound} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {currentRound === 'screening' ? 'Screening' : 'Pitching'} Round - Evaluate Startups
          </h1>
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground">
              <strong>Juror Workflow:</strong> Evaluate the startups assigned to you by Community Managers.
            </p>
            <p className="text-sm text-muted-foreground">
              {currentRound === 'screening' 
                ? 'Complete screening evaluations by reviewing pitch decks and providing scores and feedback for each assigned startup.'
                : 'Join scheduled pitch calls and complete pitching evaluations after each presentation to help determine final selections.'
              }
            </p>
          </div>
          
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
                  <div className="text-2xl font-bold text-primary">{Math.round(completionRate)}%</div>
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
                  <Input placeholder="Search startups by name, verticals, or description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
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
        <StartupsEvaluationList 
          startups={filteredStartups} 
          loading={loading} 
          onEvaluationUpdate={fetchAssignedStartups}
          currentRound={currentRound}
        />
      </main>
    </div>;
};
export default EvaluationDashboard;