import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Star, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

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
  jurors: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  } | null;
}

interface StartupEvaluationsListProps {
  startupId: string;
}

export function StartupEvaluationsList({ startupId }: StartupEvaluationsListProps) {
  const [screeningEvaluations, setScreeningEvaluations] = useState<Evaluation[]>([]);
  const [pitchingEvaluations, setPitchingEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!startupId) return;

      setLoading(true);
      try {
        // First fetch evaluations
        const [screeningResult, pitchingResult] = await Promise.all([
          supabase
            .from('screening_evaluations')
            .select('*')
            .eq('startup_id', startupId),
          supabase
            .from('pitching_evaluations')
            .select('*')
            .eq('startup_id', startupId)
        ]);

        if (screeningResult.error) throw screeningResult.error;
        if (pitchingResult.error) throw pitchingResult.error;

        // Then fetch juror data for each evaluation
        const screeningEvals = screeningResult.data || [];
        const pitchingEvals = pitchingResult.data || [];

        // Get unique evaluator IDs
        const evaluatorIds = [...new Set([
          ...screeningEvals.map(e => e.evaluator_id),
          ...pitchingEvals.map(e => e.evaluator_id)
        ])];

        // Fetch juror data
        const jurorsResult = await supabase
          .from('jurors')
          .select('user_id, id, name, email, company')
          .in('user_id', evaluatorIds);

        if (jurorsResult.error) throw jurorsResult.error;

        const jurorsMap = new Map(
          (jurorsResult.data || []).map(juror => [juror.user_id, juror])
        );

        // Combine evaluations with juror data
        const enrichedScreeningEvals = screeningEvals.map(evaluation => ({
          ...evaluation,
          jurors: jurorsMap.get(evaluation.evaluator_id) || null
        }));

        const enrichedPitchingEvals = pitchingEvals.map(evaluation => ({
          ...evaluation,
          jurors: jurorsMap.get(evaluation.evaluator_id) || null
        }));

        setScreeningEvaluations(enrichedScreeningEvals as any);
        setPitchingEvaluations(enrichedPitchingEvals as any);
      } catch (error) {
        console.error('Error fetching evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [startupId]);

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const EvaluationCard = ({ evaluation, round }: { evaluation: Evaluation; round: string }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{evaluation.jurors?.name || 'Anonymous'}</p>
                {evaluation.jurors?.company && (
                  <p className="text-xs text-muted-foreground">{evaluation.jurors.company}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {round}
            </Badge>
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Evaluated {format(new Date(evaluation.updated_at), 'MMM d, yyyy')}</span>
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
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground">No evaluations yet</h3>
        <p className="text-muted-foreground">This startup hasn't been evaluated by any VCs yet.</p>
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
              <p className="text-muted-foreground">No screening evaluations yet</p>
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
              <p className="text-muted-foreground">No pitching evaluations yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}