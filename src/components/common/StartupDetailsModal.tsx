import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Globe, Mail, Users, Star, TrendingUp } from "lucide-react";
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
    } catch (error) {
      console.error('Error fetching startup details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
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