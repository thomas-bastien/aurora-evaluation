import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, User, TrendingUp, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatScore } from "@/lib/utils";

interface EvaluationData {
  id: string;
  overall_score: number | null;
  criteria_scores: Record<string, number>;
  strengths: string[];
  improvement_areas: string;
  pitch_development_aspects: string;
  overall_notes: string;
  recommendation: string;
  wants_pitch_session: boolean;
  investment_amount: number | null;
  created_at: string;
  juror: {
    id: string;
    name: string;
    company?: string;
  };
}

interface CMStartupEvaluationsViewProps {
  startup: {
    id: string;
    name: string;
    description?: string;
  };
  open: boolean;
  onClose: () => void;
  currentRound: 'screening' | 'pitching';
}

export const CMStartupEvaluationsView = ({
  startup,
  open,
  onClose,
  currentRound
}: CMStartupEvaluationsViewProps) => {
  const [evaluations, setEvaluations] = useState<EvaluationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEvaluations: 0,
    averageScore: 0,
    recommendationDistribution: { yes: 0, no: 0, maybe: 0 },
    wantsPitchCount: 0
  });

  useEffect(() => {
    if (open && startup.id) {
      fetchEvaluations();
    }
  }, [open, startup.id, currentRound]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      
      const { data, error } = await supabase
        .from(evaluationTable)
        .select(`
          id,
          overall_score,
          criteria_scores,
          strengths,
          improvement_areas,
          pitch_development_aspects,
          overall_notes,
          recommendation,
          wants_pitch_session,
          investment_amount,
          created_at,
          evaluator_id,
          jurors!inner(
            id,
            name,
            company
          )
        `)
        .eq('startup_id', startup.id)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedEvaluations = data?.map(evaluation => ({
        id: evaluation.id,
        overall_score: evaluation.overall_score,
        criteria_scores: evaluation.criteria_scores as Record<string, number>,
        strengths: evaluation.strengths as string[] || [],
        improvement_areas: evaluation.improvement_areas || '',
        pitch_development_aspects: evaluation.pitch_development_aspects || '',
        overall_notes: evaluation.overall_notes || '',
        recommendation: evaluation.recommendation || '',
        wants_pitch_session: evaluation.wants_pitch_session || false,
        investment_amount: evaluation.investment_amount,
        created_at: evaluation.created_at,
        juror: {
          id: (evaluation.jurors as any).id,
          name: (evaluation.jurors as any).name,
          company: (evaluation.jurors as any).company
        }
      })) || [];

      setEvaluations(mappedEvaluations);
      calculateStats(mappedEvaluations);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (evaluations: EvaluationData[]) => {
    const totalEvaluations = evaluations.length;
    const validScores = evaluations.filter(e => e.overall_score !== null);
    const averageScore = validScores.length > 0 
      ? validScores.reduce((sum, e) => sum + (e.overall_score || 0), 0) / validScores.length 
      : 0;
    
    const recommendationDistribution = evaluations.reduce(
      (acc, evaluation) => {
        const rec = evaluation.recommendation.toLowerCase();
        if (rec.includes('recommend') || rec.includes('yes')) acc.yes++;
        else if (rec.includes('not') || rec.includes('no')) acc.no++;
        else acc.maybe++;
        return acc;
      },
      { yes: 0, no: 0, maybe: 0 }
    );

    const wantsPitchCount = evaluations.filter(e => e.wants_pitch_session).length;

    setStats({
      totalEvaluations,
      averageScore,
      recommendationDistribution,
      wantsPitchCount
    });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getRecommendationBadge = (recommendation: string) => {
    const rec = recommendation.toLowerCase();
    if (rec.includes('recommend') || rec.includes('yes')) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Recommend</Badge>;
    } else if (rec.includes('not') || rec.includes('no')) {
      return <Badge variant="destructive">Not Recommend</Badge>;
    } else {
      return <Badge variant="secondary">Maybe</Badge>;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Evaluations...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Evaluations for {startup.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview & Stats</TabsTrigger>
            <TabsTrigger value="individual">Individual Evaluations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ScrollArea className="h-[70vh]">
              {evaluations.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Evaluations Yet</h3>
                      <p className="text-muted-foreground">
                        No submitted evaluations found for this startup in the {currentRound} round.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Evaluations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Average Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                        {stats.averageScore > 0 ? formatScore(stats.averageScore) : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Want Pitch Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.wantsPitchCount}/{stats.totalEvaluations}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Recommend:</span>
                          <span className="font-semibold">{stats.recommendationDistribution.yes}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-yellow-600">Maybe:</span>
                          <span className="font-semibold">{stats.recommendationDistribution.maybe}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">No:</span>
                          <span className="font-semibold">{stats.recommendationDistribution.no}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="individual" className="space-y-4">
            <ScrollArea className="h-[70vh]">
              {evaluations.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Individual Evaluations</h3>
                      <p className="text-muted-foreground">
                        No individual evaluations to display for this startup.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {evaluations.map((evaluation) => (
                    <Card key={evaluation.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{evaluation.juror.name}</CardTitle>
                            {evaluation.juror.company && (
                              <p className="text-sm text-muted-foreground">{evaluation.juror.company}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getRecommendationBadge(evaluation.recommendation)}
                            {evaluation.wants_pitch_session && (
                              <Badge variant="outline" className="text-blue-600">Wants Pitch</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {evaluation.overall_score && (
                          <div className="flex items-center gap-2">
                            <Star className={`w-5 h-5 ${getScoreColor(evaluation.overall_score)}`} />
                            <span className={`font-semibold ${getScoreColor(evaluation.overall_score)}`}>
                              Overall Score: {formatScore(evaluation.overall_score)}
                            </span>
                          </div>
                        )}

                        {evaluation.strengths && evaluation.strengths.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Strengths</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {evaluation.strengths.map((strength, index) => (
                                <li key={index} className="text-sm">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {evaluation.improvement_areas && (
                          <div>
                            <h4 className="font-semibold mb-2">Areas for Improvement</h4>
                            <p className="text-sm">{evaluation.improvement_areas}</p>
                          </div>
                        )}

                        {evaluation.overall_notes && (
                          <div>
                            <h4 className="font-semibold mb-2">Overall Notes</h4>
                            <p className="text-sm">{evaluation.overall_notes}</p>
                          </div>
                        )}

                        {evaluation.investment_amount && (
                          <div>
                            <h4 className="font-semibold mb-2">Investment Interest</h4>
                            <p className="text-sm">£{evaluation.investment_amount.toLocaleString()}</p>
                          </div>
                        )}

                        <Separator />
                        <p className="text-xs text-muted-foreground">
                          Submitted on {new Date(evaluation.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};