import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Star, Building, Clock, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { StartupEvaluationModal } from '@/components/evaluation/StartupEvaluationModal';

interface Evaluation {
  id: string;
  startup_id: string;
  evaluator_id: string;
  overall_score: number | null;
  recommendation: string | null;
  strengths: string[] | null;
  improvement_areas: string | null;
  overall_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  startup: {
    id: string;
    name: string;
    verticals: string[] | null;
    stage: string | null;
  } | null;
}

interface JurorEvaluationsListProps {
  jurorUserId: string;
}

export function JurorEvaluationsList({ jurorUserId }: JurorEvaluationsListProps) {
  const [screeningEvaluations, setScreeningEvaluations] = useState<Evaluation[]>([]);
  const [pitchingEvaluations, setPitchingEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStartup, setSelectedStartup] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [currentRound, setCurrentRound] = useState<'screening' | 'pitching'>('screening');
  const { user } = useAuth();
  const { profile } = useUserProfile();

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!jurorUserId) return;

      setLoading(true);
      try {
        // Fetch evaluations made by this juror
        const [screeningResult, pitchingResult] = await Promise.all([
          supabase
            .from('screening_evaluations')
            .select('*')
            .eq('evaluator_id', jurorUserId),
          supabase
            .from('pitching_evaluations')
            .select('*')
            .eq('evaluator_id', jurorUserId)
        ]);

        if (screeningResult.error) throw screeningResult.error;
        if (pitchingResult.error) throw pitchingResult.error;

        const screeningEvals = screeningResult.data || [];
        const pitchingEvals = pitchingResult.data || [];

        // Get unique startup IDs
        const startupIds = [...new Set([
          ...screeningEvals.map(e => e.startup_id),
          ...pitchingEvals.map(e => e.startup_id)
        ])];

        // Fetch startup data
        const startupsResult = await supabase
          .from('startups')
          .select('*')
          .in('id', startupIds);

        if (startupsResult.error) throw startupsResult.error;

        const startupsMap = new Map(
          (startupsResult.data || []).map(startup => [startup.id, startup])
        );

        // Combine evaluations with startup data
        const enrichedScreeningEvals = screeningEvals.map(evaluation => ({
          ...evaluation,
          startup: startupsMap.get(evaluation.startup_id) || null
        }));

        const enrichedPitchingEvals = pitchingEvals.map(evaluation => ({
          ...evaluation,
          startup: startupsMap.get(evaluation.startup_id) || null
        }));

        setScreeningEvaluations(enrichedScreeningEvals as any);
        setPitchingEvaluations(enrichedPitchingEvals as any);
      } catch (error) {
        console.error('Error fetching juror evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [jurorUserId]);

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleOpenModal = (evaluation: Evaluation, round: 'screening' | 'pitching') => {
    if (!evaluation.startup) return;
    
    // Transform startup data to match modal expectations
    const startupForModal = {
      ...evaluation.startup,
      evaluation_status: evaluation.status === 'submitted' ? 'completed' : evaluation.status,
      evaluation_id: evaluation.id,
      overall_score: evaluation.overall_score
    };
    
    setSelectedStartup(startupForModal);
    setCurrentRound(round);
    setModalMode(evaluation.status === 'submitted' ? 'view' : 'edit');
  };

  const EvaluationCard = ({ evaluation, round }: { evaluation: Evaluation; round: string }) => (
    <Card 
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow" 
      onClick={() => handleOpenModal(evaluation, round as 'screening' | 'pitching')}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{evaluation.startup?.name || 'Unknown Startup'}</p>
                {evaluation.startup?.verticals && evaluation.startup.verticals.length > 0 && (
                  <p className="text-xs text-muted-foreground">{evaluation.startup.verticals.join(', ')}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {round}
            </Badge>
            {evaluation.startup?.stage && (
              <Badge variant="secondary" className="capitalize">
                {evaluation.startup.stage}
              </Badge>
            )}
            <Badge variant={evaluation.status === 'submitted' ? 'default' : 'secondary'} className="capitalize">
              {evaluation.status}
            </Badge>
            {evaluation.overall_score && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className={`font-bold ${getScoreColor(evaluation.overall_score)}`}>
                  {formatScore(evaluation.overall_score)}/10
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Evaluated {format(new Date(evaluation.updated_at), 'MMM d, yyyy')}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/startup/${evaluation.startup_id}`, '_blank');
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Startup Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {evaluation.recommendation && (
          <div>
            <h4 className="font-medium text-sm mb-2">Recommendation</h4>
            <p className="text-sm text-muted-foreground capitalize">
              {evaluation.recommendation.replace('_', ' ')}
            </p>
          </div>
        )}
        
        {evaluation.strengths && evaluation.strengths.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Key Strengths</h4>
            <div className="space-y-1">
              {evaluation.strengths.map((strength, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {strength}
                </p>
              ))}
            </div>
          </div>
        )}
        
        {evaluation.improvement_areas && (
          <div>
            <h4 className="font-medium text-sm mb-2">Improvement Areas</h4>
            <p className="text-sm text-muted-foreground">{evaluation.improvement_areas}</p>
          </div>
        )}
        
        {evaluation.overall_notes && (
          <div>
            <h4 className="font-medium text-sm mb-2">Overall Notes</h4>
            <p className="text-sm text-muted-foreground">{evaluation.overall_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalEvaluations = screeningEvaluations.length + pitchingEvaluations.length;

  if (totalEvaluations === 0) {
    // For jurors viewing another juror's evaluations
    if (profile?.role === 'vc' && user?.id !== jurorUserId) {
      return (
        <div className="text-center py-12">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Access Restricted</h3>
          <p className="text-muted-foreground">
            Evaluations are not visible because you do not have access to see other jurors' evaluations.
          </p>
        </div>
      );
    }

    // For users viewing their own evaluations or admins viewing any evaluations
    const message = user?.id === jurorUserId 
      ? "You haven't submitted any evaluations yet"
      : "No evaluations submitted yet";
    
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground">No evaluations yet</h3>
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  const defaultTab = screeningEvaluations.length > 0 ? 'screening' : 'pitching';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Evaluations ({totalEvaluations})</h3>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Screening: {screeningEvaluations.length}</span>
          <span>Pitching: {pitchingEvaluations.length}</span>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="screening" className="relative">
            Screening Round
            {screeningEvaluations.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {screeningEvaluations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pitching" className="relative">
            Pitching Round
            {pitchingEvaluations.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {pitchingEvaluations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="screening" className="mt-6">
          {screeningEvaluations.length > 0 ? (
            <div className="space-y-4">
              {screeningEvaluations.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  round="screening"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No screening evaluations submitted yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pitching" className="mt-6">
          {pitchingEvaluations.length > 0 ? (
            <div className="space-y-4">
              {pitchingEvaluations.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  round="pitching"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No pitching evaluations submitted yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Evaluation Modal */}
      {selectedStartup && (
        <StartupEvaluationModal
          startup={selectedStartup}
          open={!!selectedStartup}
          onClose={() => setSelectedStartup(null)}
          onEvaluationUpdate={() => {
            // Refresh evaluations after update
            const fetchEvaluations = async () => {
              if (!jurorUserId) return;
              setLoading(true);
              try {
                const [screeningResult, pitchingResult] = await Promise.all([
                  supabase.from('screening_evaluations').select('*').eq('evaluator_id', jurorUserId),
                  supabase.from('pitching_evaluations').select('*').eq('evaluator_id', jurorUserId)
                ]);
                
                if (screeningResult.error) throw screeningResult.error;
                if (pitchingResult.error) throw pitchingResult.error;
                
                const screeningEvals = screeningResult.data || [];
                const pitchingEvals = pitchingResult.data || [];
                const startupIds = [...new Set([...screeningEvals.map(e => e.startup_id), ...pitchingEvals.map(e => e.startup_id)])];
                
                const startupsResult = await supabase.from('startups').select('*').in('id', startupIds);
                if (startupsResult.error) throw startupsResult.error;
                
                const startupsMap = new Map((startupsResult.data || []).map(startup => [startup.id, startup]));
                
                setScreeningEvaluations(screeningEvals.map(evaluation => ({ ...evaluation, startup: startupsMap.get(evaluation.startup_id) || null })) as any);
                setPitchingEvaluations(pitchingEvals.map(evaluation => ({ ...evaluation, startup: startupsMap.get(evaluation.startup_id) || null })) as any);
              } catch (error) {
                console.error('Error refreshing evaluations:', error);
              } finally {
                setLoading(false);
              }
            };
            fetchEvaluations();
          }}
          mode={modalMode}
          currentRound={currentRound}
        />
      )}
    </div>
  );
}