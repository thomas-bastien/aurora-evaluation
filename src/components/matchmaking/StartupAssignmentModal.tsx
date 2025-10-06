import { useState, useEffect } from 'react';
import { MatchmakingCompatibility } from './MatchmakingCompatibility';
import { findBestJurors } from '@/utils/matchmakingUtils';
import { normalizeRegions, normalizeStages, normalizeVerticals } from '@/utils/fieldNormalization';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Building2, Mail, User, Star, Target, MapPin, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

interface Startup {
  id: string;
  name: string;
  verticals?: string[];
  stage: string;
  description: string;
  location: string;
  founder_names: string[];
  regions?: string[];
}

interface Juror {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  preferred_regions?: string[] | null;
  target_verticals?: string[] | null;
  preferred_stages?: string[] | null;
  linkedin_url?: string | null;
  evaluation_limit?: number | null;
}

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

interface StartupAssignmentModalProps {
  startup: Startup;
  jurors: Juror[];
  existingAssignments: Assignment[];
  currentRound: 'screeningRound' | 'pitchingRound';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (assignments: Assignment[]) => void;
}

export const StartupAssignmentModal = ({
  startup,
  jurors,
  existingAssignments,
  currentRound,
  open,
  onOpenChange,
  onComplete
}: StartupAssignmentModalProps) => {
  const [selectedJurorIds, setSelectedJurorIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [jurorAssignmentCounts, setJurorAssignmentCounts] = useState<Map<string, number>>(new Map());
  const [aiScores, setAiScores] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const { toast } = useToast();

  // Fetch AI scores on modal open
  useEffect(() => {
    if (open && useAI && jurors.length > 0) {
      setLoadingAI(true);
      supabase.functions.invoke('ai-matchmaking', {
        body: {
          startup: {
            id: startup.id,
            name: startup.name,
            verticals: startup.verticals || [],
            stage: startup.stage || 'N/A',
            regions: startup.regions || [],
            description: startup.description || ''
          },
          jurors: jurors.map(j => ({
            id: j.id,
            name: j.name,
            company: j.company || '',
            job_title: j.job_title || '',
            target_verticals: j.target_verticals || [],
            preferred_stages: j.preferred_stages || [],
            preferred_regions: j.preferred_regions || []
          })),
          roundType: currentRound === 'screeningRound' ? 'screening' : 'pitching'
        }
      }).then(({ data, error }) => {
        setLoadingAI(false);
        if (!error && data?.success && data?.scores) {
          setAiScores(data.scores);
          console.log('AI scores loaded:', data.scores.length);
        } else {
          console.warn('AI matchmaking failed, using rule-based only');
        }
      }).catch(err => {
        console.error('AI matchmaking error:', err);
        setLoadingAI(false);
      });
    }
  }, [open, useAI]);
  useEffect(() => {
    setSelectedJurorIds(existingAssignments.map(a => a.juror_id));
  }, [existingAssignments]);

  // Fetch assignment counts when modal opens (round-specific)
  useEffect(() => {
    const fetchAssignmentCounts = async () => {
      if (!open) return;
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Determine which table based on current round
      const assignmentTable = currentRound === 'screeningRound' 
        ? 'screening_assignments' 
        : 'pitching_assignments';
      
      // Fetch ONLY from the current round's table
      const { data } = await supabase
        .from(assignmentTable)
        .select('juror_id')
        .eq('status', 'assigned');
      
      // Count assignments per juror for THIS ROUND ONLY
      const counts = new Map<string, number>();
      (data || []).forEach(assignment => {
        counts.set(
          assignment.juror_id, 
          (counts.get(assignment.juror_id) || 0) + 1
        );
      });
      
      setJurorAssignmentCounts(counts);
    };
    
    fetchAssignmentCounts();
  }, [open, currentRound]);

  const filteredJurors = jurors.filter(juror =>
    juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    juror.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    juror.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate fit score between startup and juror (10-point scale)
  const calculateFitScore = (juror: Juror) => {
    let score = 0;
    let matches = {
      region: false,
      vertical: false,
      stage: false
    };
    let breakdown = {
      region: 0,
      vertical: 0,
      stage: 0
    };

    // Normalize data before comparison
    const normalizedStartupRegions = normalizeRegions(startup.regions || []);
    const normalizedJurorRegions = normalizeRegions(juror.preferred_regions || []);
    const normalizedStartupVerticals = normalizeVerticals(startup.verticals || []);
    const normalizedJurorVerticals = normalizeVerticals(juror.target_verticals || []);
    const normalizedStartupStage = startup.stage ? normalizeStages([startup.stage])[0] : null;
    const normalizedJurorStages = normalizeStages(juror.preferred_stages || []);

    // Region match (+4 points)
    if (normalizedJurorRegions.length > 0 && normalizedStartupRegions.length > 0) {
      const regionMatches = normalizedStartupRegions.some(region => normalizedJurorRegions.includes(region));
      if (regionMatches) {
        score += 4;
        breakdown.region = 4;
        matches.region = true;
      }
    }

    // Vertical match (+3 points)
    if (normalizedJurorVerticals.length > 0 && normalizedStartupVerticals.length > 0) {
      const verticalMatches = normalizedStartupVerticals.some(vertical => normalizedJurorVerticals.includes(vertical));
      if (verticalMatches) {
        score += 3;
        breakdown.vertical = 3;
        matches.vertical = true;
      }
    }

    // Stage match (+3 points)
    if (normalizedStartupStage && normalizedJurorStages.length > 0) {
      if (normalizedJurorStages.includes(normalizedStartupStage)) {
        score += 3;
        breakdown.stage = 3;
        matches.stage = true;
      }
    }

    return { score, matches, breakdown };
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Calculate effective limit for juror
  const getEffectiveLimit = (juror: Juror): number => {
    if (juror.evaluation_limit !== null && juror.evaluation_limit !== undefined) {
      return juror.evaluation_limit;
    }
    // Default to 4 if no custom limit set
    return 4;
  };

  // Sort jurors by combined AI + rule-based score
  const sortedJurors = filteredJurors.sort((a, b) => {
    const scoreA = calculateFitScore(a).score;
    const scoreB = calculateFitScore(b).score;
    
    if (aiScores && useAI) {
      const aiA = aiScores.find((s: any) => s.juror_id === a.id)?.compatibility_score || 0;
      const aiB = aiScores.find((s: any) => s.juror_id === b.id)?.compatibility_score || 0;
      const combinedA = (aiA * 0.7) + (scoreA * 3 * 0.3);
      const combinedB = (aiB * 0.7) + (scoreB * 3 * 0.3);
      return combinedB - combinedA;
    }
    
    return scoreB - scoreA;
  });

  const handleJurorToggle = (jurorId: string) => {
    setSelectedJurorIds(prev => 
      prev.includes(jurorId)
        ? prev.filter(id => id !== jurorId)
        : [...prev, jurorId]
    );
  };

  const handleSave = async () => {
    // Soft warning for < 3 jurors (don't block)
    if (selectedJurorIds.length > 0 && selectedJurorIds.length < 3) {
      toast({
        title: "⚠️ Below Recommended Minimum",
        description: `Only ${selectedJurorIds.length} juror(s) assigned. We recommend at least 3 evaluations per startup.`,
      });
    }

    try {
      // Import supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Determine which table based on current round
      const assignmentTable = currentRound === 'screeningRound' 
        ? 'screening_assignments' 
        : 'pitching_assignments';
      
      // Delete existing assignments from THE CURRENT ROUND'S TABLE ONLY
      const { error: deleteError } = await supabase
        .from(assignmentTable)
        .delete()
        .eq('startup_id', startup.id);
      
      if (deleteError) throw deleteError;

      // Create new assignments in THE CURRENT ROUND'S TABLE
      const assignmentRecords = selectedJurorIds.map(jurorId => ({
        startup_id: startup.id,
        juror_id: jurorId,
        status: 'assigned'
      }));

      const { error: insertError } = await supabase
        .from(assignmentTable)
        .insert(assignmentRecords);
      
      if (insertError) throw insertError;

      // Create assignment objects for local state update
      const newAssignments: Assignment[] = selectedJurorIds.map(jurorId => {
        const juror = jurors.find(j => j.id === jurorId);
        return {
          startup_id: startup.id,
          juror_id: jurorId,
          startup_name: startup.name,
          juror_name: juror?.name || ''
        };
      });

      onComplete(newAssignments);
      
      toast({
        title: "Success",
        description: "Assignment saved successfully to database."
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: "Error",
        description: "Failed to save assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Assign Jurors to {startup.name}
          </DialogTitle>
          <DialogDescription>
            Select at least 3 jurors to evaluate this startup. You can assign more than 3 if needed.
          </DialogDescription>
        </DialogHeader>

        {/* Startup Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{startup.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                {startup.verticals && startup.verticals.map(vertical => (
                  <Badge key={vertical} variant="outline">{vertical}</Badge>
                ))}
                <Badge variant="outline">{startup.stage}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{startup.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{startup.location}</span>
                {startup.founder_names && startup.founder_names.length > 0 && (
                  <span>Founders: {startup.founder_names.join(", ")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search jurors by name, company, or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection Summary */}
        <div className="mb-4 p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                Selected: {selectedJurorIds.length} jurors
              </span>
              {loadingAI && (
                <span className="ml-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI analyzing...
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="rounded"
                />
                <Sparkles className="w-3 h-3" />
                AI Enhanced
              </label>
              <span className="text-sm text-muted-foreground">
                {selectedJurorIds.length >= 3 ? (
                  <span className="text-success">✓ Minimum requirement met</span>
                ) : selectedJurorIds.length > 0 ? (
                  <span className="text-warning">⚠️ Below minimum (3 recommended)</span>
                ) : (
                  <span className="text-muted-foreground">No jurors selected</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Jurors List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedJurors.map((juror, index) => {
            const isSelected = selectedJurorIds.includes(juror.id);
            const { score, matches, breakdown } = calculateFitScore(juror);
            const aiMatch = aiScores?.find((s: any) => s.juror_id === juror.id);
            const isAITopPick = useAI && aiScores && index < 3;
            
            return (
              <div
                key={juror.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => handleJurorToggle(juror.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => {}} // Handled by parent onClick
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{juror.name}</span>
                        {isAITopPick && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Pick
                          </Badge>
                        )}
                      </div>
                      {/* Prominent Fit Score Badge */}
                      <div className={`px-3 py-1 rounded-full border font-semibold text-sm ${getScoreColor(score)}`}>
                        {score}/10
                        {aiMatch && (
                          <span className="ml-2 text-xs opacity-70">
                            AI: {Math.round(aiMatch.compatibility_score)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span>{juror.job_title}</span>
                      <span>@{juror.company}</span>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {juror.email}
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    {aiMatch && useAI && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <div className="font-semibold text-blue-900 mb-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          AI Analysis ({aiMatch.recommendation || 'Recommended'})
                          <span className="ml-auto text-xs opacity-70">
                            Confidence: {Math.round((aiMatch.confidence || 0) * 100)}%
                          </span>
                        </div>
                        {aiMatch.reasoning && (
                          <div className="space-y-1 text-blue-800">
                            {aiMatch.reasoning.vertical_match && (
                              <div>• {aiMatch.reasoning.vertical_match.explanation}</div>
                            )}
                            {aiMatch.reasoning.contextual_fit && (
                              <div>• {aiMatch.reasoning.contextual_fit.explanation}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Score Breakdown */}
                    {score > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-2">Rule-based Score Breakdown:</div>
                        <div className="flex flex-wrap gap-2">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${matches.region ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <MapPin className="w-2 h-2" />
                            Region: {breakdown.region}/4
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${matches.vertical ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Target className="w-2 h-2" />
                            Vertical: {breakdown.vertical}/3
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${matches.stage ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Building2 className="w-2 h-2" />
                            Stage: {breakdown.stage}/3
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            (jurorAssignmentCounts.get(juror.id) || 0) < getEffectiveLimit(juror)
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            <Star className="w-2 h-2" />
                            Assignments: {jurorAssignmentCounts.get(juror.id) || 0}/{getEffectiveLimit(juror)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Zero Score Message */}
                    {score === 0 && !aiMatch && (
                      <div className="mt-2 text-xs text-muted-foreground italic">
                        No criteria matches found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredJurors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No jurors found matching your search criteria.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedJurorIds.length} of {jurors.length} jurors selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
            >
              Save Assignment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};