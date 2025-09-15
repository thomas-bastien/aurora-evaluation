import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Globe, Mail, Users, Star, TrendingUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatScore } from "@/lib/utils";

interface StartupDetails {
  id: string;
  name: string;
  description: string | null;
  verticals: string[];
  stage: string | null;
  regions: string[];
  pitch_deck_url: string | null;
  demo_url: string | null;
  contact_email: string | null;
  founder_names: string[];
  website: string | null;
  status: string;
  averageScore?: number | null;
  totalScore?: number | null;
  totalEvaluations?: number;
}

interface IndividualEvaluation {
  id: string;
  juror_name: string;
  juror_company: string | null;
  juror_job_title: string | null;
  overall_score: number | null;
  strengths: string[] | null;
  improvement_areas: string | null;
  overall_notes: string | null;
  recommendation: string | null;
  status: string;
  created_at: string;
}

interface StartupDetailsModalProps {
  startup: {
    id: string;
    name: string;
  } | null;
  open: boolean;
  onClose: () => void;
  currentRound?: 'screening' | 'pitching';
}

export const StartupDetailsModal = ({
  startup,
  open,
  onClose,
  currentRound = 'screening'
}: StartupDetailsModalProps) => {
  const [startupDetails, setStartupDetails] = useState<StartupDetails | null>(null);
  const [individualEvaluations, setIndividualEvaluations] = useState<IndividualEvaluation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && startup?.id) {
      fetchStartupDetails();
    }
  }, [open, startup?.id, currentRound]);

  const fetchStartupDetails = async () => {
    if (!startup?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch startup basic information
      const { data: startupData, error: startupError } = await supabase
        .from('startups')
        .select('*')
        .eq('id', startup.id)
        .single();

      if (startupError) throw startupError;

      // Fetch evaluation stats for this round
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from(evaluationTable)
        .select('overall_score')
        .eq('startup_id', startup.id)
        .eq('status', 'submitted');

      if (evaluationsError) throw evaluationsError;

      // Fetch individual evaluations with juror information
      const { data: individualEvals, error: individualEvalsError } = await supabase
        .from(evaluationTable)
        .select(`
          id,
          overall_score,
          strengths,
          improvement_areas,
          overall_notes,
          recommendation,
          status,
          created_at,
          evaluator_id
        `)
        .eq('startup_id', startup.id)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (individualEvalsError) throw individualEvalsError;

      // Fetch juror information for each evaluation
      const evaluatorIds = individualEvals?.map(evaluation => evaluation.evaluator_id).filter(Boolean) || [];
      let jurorsData: any[] = [];
      
      if (evaluatorIds.length > 0) {
        const { data: jurors, error: jurorsError } = await supabase
          .from('jurors')
          .select('user_id, name, company, job_title')
          .in('user_id', evaluatorIds);

        if (jurorsError) throw jurorsError;
        jurorsData = jurors || [];
      }

      // Combine evaluation and juror data
      const enrichedEvaluations: IndividualEvaluation[] = individualEvals?.map(evaluation => {
        const juror = jurorsData.find(j => j.user_id === evaluation.evaluator_id);
        return {
          id: evaluation.id,
          juror_name: juror?.name || 'Unknown Juror',
          juror_company: juror?.company || null,
          juror_job_title: juror?.job_title || null,
          overall_score: evaluation.overall_score,
          strengths: evaluation.strengths,
          improvement_areas: evaluation.improvement_areas,
          overall_notes: evaluation.overall_notes,
          recommendation: evaluation.recommendation,
          status: evaluation.status,
          created_at: evaluation.created_at
        };
      }) || [];

      // Calculate evaluation metrics
      const validScores = evaluationsData?.filter(e => e.overall_score !== null) || [];
      const averageScore = validScores.length > 0 
        ? validScores.reduce((sum, e) => sum + (e.overall_score || 0), 0) / validScores.length 
        : null;
      const totalScore = validScores.reduce((sum, e) => sum + (e.overall_score || 0), 0);

      const details: StartupDetails = {
        id: startupData.id,
        name: startupData.name,
        description: startupData.description,
        verticals: startupData.verticals || [],
        stage: startupData.stage,
        regions: startupData.regions || [],
        pitch_deck_url: startupData.pitch_deck_url,
        demo_url: startupData.demo_url,
        contact_email: startupData.contact_email,
        founder_names: startupData.founder_names || [],
        website: startupData.website,
        status: startupData.status || 'pending',
        averageScore,
        totalScore,
        totalEvaluations: evaluationsData?.length || 0
      };

      setStartupDetails(details);
      setIndividualEvaluations(enrichedEvaluations);
    } catch (error) {
      console.error('Error fetching startup details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 8) return "text-success";
    if (score >= 6) return "text-primary";
    if (score >= 4) return "text-warning";
    return "text-destructive";
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Startup Details...</DialogTitle>
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

  if (!startupDetails) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {startupDetails.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {startupDetails.stage && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Stage:</span>
                      <Badge variant="outline">{startupDetails.stage}</Badge>
                    </div>
                  )}
                  
                  {startupDetails.regions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Regions:</span>
                      <div className="flex gap-1 flex-wrap">
                        {startupDetails.regions.map((region, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {region}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {startupDetails.verticals.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Verticals:</span>
                      <div className="flex gap-1 flex-wrap">
                        {startupDetails.verticals.map((vertical, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {vertical}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {startupDetails.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Contact:</span>
                      <a 
                        href={`mailto:${startupDetails.contact_email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {startupDetails.contact_email}
                      </a>
                    </div>
                  )}
                  
                  {startupDetails.founder_names.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Founders:</span>
                      <span className="text-sm">{startupDetails.founder_names.join(', ')}</span>
                    </div>
                  )}
                  
                  {startupDetails.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Website:</span>
                      <a 
                        href={startupDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {startupDetails.website}
                      </a>
                    </div>
                   )}
                 </div>
                 
                 {/* Startup Profile Button */}
                 <div className="mt-4 pt-4 border-t">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => window.open(`/startup/${startupDetails.id}`, '_blank')}
                     className="flex items-center gap-2"
                   >
                     <ExternalLink className="w-4 h-4" />
                     Startup Profile
                   </Button>
                 </div>
               </CardContent>
             </Card>

            {/* Description */}
            {startupDetails.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{startupDetails.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Evaluation Metrics */}
            {startupDetails.totalEvaluations > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evaluation Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{startupDetails.totalEvaluations}</div>
                      <div className="text-sm text-muted-foreground">Total Evaluations</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(startupDetails.averageScore)}`}>
                        {startupDetails.averageScore ? formatScore(startupDetails.averageScore) : 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Average Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {startupDetails.totalScore || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual Evaluations */}
            {individualEvaluations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Individual Evaluations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {individualEvaluations.map(evaluation => (
                    <Card key={evaluation.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg">{evaluation.juror_name}</CardTitle>
                            {evaluation.overall_score !== null && (
                              <div className={`text-2xl font-bold ${getScoreColor(evaluation.overall_score)}`}>
                                {formatScore(evaluation.overall_score)}/10
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {evaluation.overall_score === null && (
                              <Badge variant="outline" className="text-muted-foreground">No Score</Badge>
                            )}
                            <Badge variant="default">Evaluation Complete</Badge>
                          </div>
                        </div>
                        <CardDescription>
                          {[evaluation.juror_job_title, evaluation.juror_company].filter(Boolean).join(' at ')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {evaluation.strengths && evaluation.strengths.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Strengths:</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {evaluation.strengths.map((strength, index) => (
                                <li key={index}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {evaluation.improvement_areas && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Improvement Areas:</p>
                            <p className="text-sm text-muted-foreground">{evaluation.improvement_areas}</p>
                          </div>
                        )}
                        
                        {evaluation.overall_notes && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Overall Notes:</p>
                            <p className="text-sm text-muted-foreground">{evaluation.overall_notes}</p>
                          </div>
                        )}
                        
                        {evaluation.recommendation && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Recommendation:</p>
                            <Badge variant="outline">{evaluation.recommendation}</Badge>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Submitted: {new Date(evaluation.created_at).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Resources */}
            {(startupDetails.pitch_deck_url || startupDetails.demo_url) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {startupDetails.pitch_deck_url && (
                      <div>
                        <span className="text-sm font-medium">Pitch Deck: </span>
                        <a 
                          href={startupDetails.pitch_deck_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Pitch Deck
                        </a>
                      </div>
                    )}
                    {startupDetails.demo_url && (
                      <div>
                        <span className="text-sm font-medium">Demo: </span>
                        <a 
                          href={startupDetails.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Demo
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};