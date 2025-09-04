import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { StartupsEvaluationList } from "@/components/evaluation/StartupsEvaluationList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Users, Building2 } from "lucide-react";
import { Navigate } from "react-router-dom";

interface AssignedStartup {
  id: string;
  name: string;
  description: string;
  industry: string;
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

export default function Evaluate() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [assignedStartups, setAssignedStartups] = useState<AssignedStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState<'screening' | 'pitching'>('screening');

  // Redirect non-VC users
  if (profile && profile.role !== 'vc') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (user && profile?.role === 'vc') {
      fetchAssignedStartups();
    }
  }, [user, profile, activeRound]);

  const fetchAssignedStartups = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Get startups assigned to this juror
      const { data: assignments, error: assignmentsError } = await supabase
        .from('startup_assignments')
        .select(`
          startup_id,
          startups!inner (
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
        .eq('juror_id', user.id)
        .eq('status', 'active');

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setAssignedStartups([]);
        return;
      }

      // Get evaluation status for each startup
      const startupIds = assignments.map(a => a.startup_id);
      const { data: evaluations, error: evaluationsError } = await supabase
        .from('evaluations')
        .select('startup_id, id, status, overall_score')
        .eq('evaluator_id', user.id)
        .in('startup_id', startupIds);

      if (evaluationsError) throw evaluationsError;

      // Combine startup data with evaluation status
      const startupsWithStatus: AssignedStartup[] = assignments.map(assignment => {
        const startup = assignment.startups;
        const evaluation = evaluations?.find(e => e.startup_id === startup.id);
        
        return {
          ...startup,
          evaluation_status: evaluation?.status === 'submitted' ? 'completed' as const :
                           evaluation?.status === 'draft' ? 'draft' as const :
                           'not_started' as const,
          evaluation_id: evaluation?.id,
          overall_score: evaluation?.overall_score
        };
      });

      setAssignedStartups(startupsWithStatus);
    } catch (error) {
      console.error('Error fetching assigned startups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluationUpdate = () => {
    fetchAssignedStartups();
  };

  // Stats calculations
  const totalAssigned = assignedStartups.length;
  const completedEvaluations = assignedStartups.filter(s => s.evaluation_status === 'completed').length;
  const draftEvaluations = assignedStartups.filter(s => s.evaluation_status === 'draft').length;
  const notStarted = assignedStartups.filter(s => s.evaluation_status === 'not_started').length;

  const getRoundTitle = () => {
    return activeRound === 'pitching' ? 'Pitching Round' : 'Screening Round';
  };

  const getRoundDescription = () => {
    return activeRound === 'pitching' 
      ? 'Evaluate semi-finalist startups after pitch sessions'
      : 'Evaluate assigned startups for semi-finalist selection';
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Evaluate Startups</h1>
          <p className="text-muted-foreground mt-2">
            Review and evaluate your assigned startups for each round
          </p>
        </div>

        {/* Round Tabs */}
        <Tabs value={activeRound} onValueChange={(value) => setActiveRound(value as 'screening' | 'pitching')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="screening">Screening Round</TabsTrigger>
            <TabsTrigger value="pitching">Pitching Round</TabsTrigger>
          </TabsList>

          <TabsContent value={activeRound} className="mt-6">
            <div className="space-y-6">
              {/* Round Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {getRoundTitle()}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    {getRoundDescription()}
                  </p>
                </CardHeader>
              </Card>

              {/* Progress Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Evaluation Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{totalAssigned}</span>
                      <span className="text-muted-foreground">Assigned</span>
                    </div>
                    
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                      {completedEvaluations} Completed
                    </Badge>
                    
                    {draftEvaluations > 0 && (
                      <Badge variant="secondary">
                        {draftEvaluations} Draft{draftEvaluations !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    
                    {notStarted > 0 && (
                      <Badge variant="outline">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {notStarted} Not Started
                      </Badge>
                    )}
                  </div>

                  {totalAssigned > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Overall Progress</span>
                        <span>{completedEvaluations}/{totalAssigned} ({Math.round((completedEvaluations / totalAssigned) * 100)}%)</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ width: `${(completedEvaluations / totalAssigned) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Startups List */}
              <StartupsEvaluationList 
                startups={assignedStartups}
                loading={loading}
                onEvaluationUpdate={handleEvaluationUpdate}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}