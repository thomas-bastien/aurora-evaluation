import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StartupEvaluationModal } from "@/components/evaluation/StartupEvaluationModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Trophy, 
  CheckCircle, 
  AlertTriangle, 
  Star,
  RotateCcw,
  Eye,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface StartupSelection {
  id: string;
  name: string;
  industry: string;
  stage: string;
  region: string;
  status: string;
  averageScore: number;
  totalScore: number;
  rank: number;
  evaluationsCount: number;
  isSelected: boolean;
  isAutoSelected: boolean;
  isPreviouslySelected: boolean;
}

interface Top30SelectionProps {
  currentRound?: string;
  isReadOnly?: boolean;
  onSelectionChange?: (count: number) => void;
  onSetConfirmCallback?: (callback: (() => Promise<void>) | null) => void;
}

export const Top30Selection = ({ currentRound = 'screening', isReadOnly = false, onSelectionChange, onSetConfirmCallback }: Top30SelectionProps) => {
  const [startups, setStartups] = useState<StartupSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionCount, setSelectionCount] = useState(0);
  const [selectedStartupForDetails, setSelectedStartupForDetails] = useState<string | null>(null);
  const [startupEvaluations, setStartupEvaluations] = useState<any[]>([]);
  const [selectedJurorEvaluation, setSelectedJurorEvaluation] = useState<any>(null);

  // Ref to access current startups value without causing re-renders
  const startupsRef = useRef<StartupSelection[]>([]);

  // Keep ref in sync with startups state
  useEffect(() => {
    startupsRef.current = startups;
  }, [startups]);

  useEffect(() => {
    fetchStartupsForSelection();
  }, []);

  useEffect(() => {
    const count = startups.filter(s => s.isSelected).length;
    setSelectionCount(count);
    onSelectionChange?.(count);
  }, [startups, onSelectionChange]);

  const handleConfirmSelection = useCallback(async () => {
    try {
      setLoading(true);
      const selectedStartups = startupsRef.current.filter(s => s.isSelected);
      
      console.log('Confirming selection for startups (PRESERVING NON-SELECTED STATUSES):', {
        selectedCount: selectedStartups.length,
        selectedIds: selectedStartups.map(s => s.id),
        currentRound,
        preservingNonSelectedStatuses: true
      });
      
      // Only update startup status to 'shortlisted' for selected startups
      // DO NOT automatically reject non-selected startups to preserve their existing statuses
      if (selectedStartups.length > 0) {
        const { error, data } = await supabase
          .from('startups')
          .update({ status: 'shortlisted' })
          .in('id', selectedStartups.map(s => s.id))
          .select('id, name, status');

        if (error) {
          console.error('Error updating selected startups:', error);
          throw new Error(`Failed to update selected startups: ${error.message}`);
        }
        
        console.log('Successfully updated selected startups to shortlisted:', data);
      }

      // REMOVED: Automatic rejection of non-selected startups
      // This preserves existing statuses like 'pending', 'under-review', etc.
      // Mass rejection should only happen during explicit round finalization
      
      toast.success(`Successfully selected ${selectedStartups.length} startups for Pitching (other statuses preserved)`);
      
      // Refresh the data to show updated statuses
      await fetchStartupsForSelection();
      
    } catch (error: any) {
      console.error('Error confirming selection:', error);
      toast.error(error.message || 'Failed to confirm selection. Please check console for details.');
    } finally {
      setLoading(false);
    }
  }, [currentRound]);

  useEffect(() => {
    // Set the confirmation callback for the parent component
    console.log('Setting confirmation callback in Top30Selection', { handleConfirmSelection });
    onSetConfirmCallback?.(handleConfirmSelection);
    
    // Cleanup function to clear callback when component unmounts
    return () => {
      onSetConfirmCallback?.(null);
    };
  }, [handleConfirmSelection, onSetConfirmCallback]);

  const fetchStartupsForSelection = async () => {
    try {
      // Determine which evaluation table to use based on current round
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      
      // Build query with status filtering for pitching round
      let query = supabase.from('startups').select(`
        *,
        ${evaluationTable}(
          overall_score,
          status
        )
      `);
      
      // During pitching round, only show semifinalists (shortlisted startups)
      if (currentRound === 'pitching') {
        query = query.eq('status', 'shortlisted');
      } else {
        // During screening round, show ALL startups regardless of status (including rejected ones for re-evaluation)
        query = query.in('status', ['pending', 'shortlisted', 'rejected', 'under-review', 'finalist']);
      }
      
      const { data: startupsData, error } = await query;

      if (error) throw error;
      
      console.log(`Fetched ${startupsData?.length || 0} startups for selection in ${currentRound} round`);

      const selectionData: StartupSelection[] = startupsData?.map(startup => {
        const evaluationKey = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
        const evaluations = startup[evaluationKey] || [];
        const submittedEvaluations = evaluations.filter((e: any) => e.status === 'submitted');
        const scores = submittedEvaluations
          .map(e => e.overall_score)
          .filter(score => score !== null) as number[];
        
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;
        
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        return {
          id: startup.id,
          name: startup.name,
          industry: startup.industry || 'N/A',
          stage: startup.stage || 'N/A',
          region: startup.region || 'N/A',
          status: startup.status || 'pending',
          averageScore,
          totalScore,
          rank: 0, // Will be set after sorting
          evaluationsCount: submittedEvaluations.length,
          isSelected: false,
          isAutoSelected: false,
          isPreviouslySelected: startup.status === 'shortlisted'
        };
      }) || [];

      console.log(`Processed ${selectionData.length} startups after evaluation mapping`);

      // Sort by average score and assign ranks (startups with no evaluations go to bottom)
      const sortedStartups = selectionData
        .sort((a, b) => {
          // If one has no evaluations and the other does, put no-evaluation at bottom
          if (a.evaluationsCount === 0 && b.evaluationsCount > 0) return 1;
          if (b.evaluationsCount === 0 && a.evaluationsCount > 0) return -1;
          // Otherwise sort by average score (higher scores first)
          return b.averageScore - a.averageScore;
        })
        .map((startup, index) => {
          const rank = index + 1;
          const isAutoSelected = rank <= 30 && startup.evaluationsCount > 0;
          return { 
            ...startup, 
            rank,
            isSelected: startup.isPreviouslySelected || isAutoSelected,
            isAutoSelected: !startup.isPreviouslySelected && isAutoSelected
          };
        });

      setStartups(sortedStartups);
    } catch (error) {
      console.error('Error fetching startups for selection:', error);
      toast.error('Failed to load startups for selection');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSelectTopRanked = () => {
    setStartups(prev => prev.map(startup => ({
      ...startup,
      isSelected: startup.rank <= 30,
      isAutoSelected: startup.rank <= 30
    })));
    toast.success('Automatically selected top ranked startups by score');
  };

  const handleToggleSelection = (startupId: string) => {
    setStartups(prev => prev.map(startup =>
      startup.id === startupId
        ? { ...startup, isSelected: !startup.isSelected, isAutoSelected: false }
        : startup
    ));
  };

  const handleClearSelections = () => {
    setStartups(prev => prev.map(startup => ({
      ...startup,
      isSelected: false,
      isAutoSelected: false
    })));
    toast.success('All selections cleared');
  };



  const viewStartupEvaluations = async (startupId: string) => {
    try {
      // Fetch all jurors assigned to evaluate this startup based on current round
      const assignmentTable = currentRound === 'screening' ? 'screening_assignments' : 'pitching_assignments';
      const { data: assignments, error } = await supabase
        .from(assignmentTable)
        .select(`
          *,
          jurors (
            id,
            name,
            email,
            company,
            job_title,
            user_id
          )
        `)
        .eq('startup_id', startupId);

      if (error) throw error;

      // Fetch evaluations for this startup to get real status
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      const jurorUserIds = assignments?.filter(a => a.jurors?.user_id).map(a => a.jurors.user_id) || [];
      
      let evaluations: any[] = [];
      if (jurorUserIds.length > 0) {
        const { data: evalData, error: evalError } = await supabase
          .from(evaluationTable)
          .select('evaluator_id, status, id, overall_score, strengths, improvement_areas')
          .eq('startup_id', startupId)
          .in('evaluator_id', jurorUserIds);

        if (evalError) throw evalError;
        evaluations = evalData || [];
      }

      // Enrich assignments with evaluation data
      const enrichedAssignments = assignments?.map(assignment => {
        const evaluation = evaluations?.find(evaluation => evaluation.evaluator_id === assignment.jurors?.user_id);
        return {
          ...assignment,
          evaluation_id: evaluation?.id,
          evaluation_status: evaluation?.status || 'not_started',
          overall_score: evaluation?.overall_score,
          strengths: evaluation?.strengths,
          improvement_areas: evaluation?.improvement_areas
        };
      }) || [];

      setStartupEvaluations(enrichedAssignments);
      setSelectedStartupForDetails(startupId);
    } catch (error) {
      console.error('Error fetching startup evaluations:', error);
      toast.error('Failed to load startup evaluations');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedStartups = startups.filter(s => s.isSelected);
  const autoSelectedCount = startups.filter(s => s.isAutoSelected).length;

  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Startup Selection
            </CardTitle>
            <CardDescription>
              Select the top performing startups to advance to Pitching
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStartupsForSelection}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Selection Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{startups.length}</div>
            <div className="text-sm text-muted-foreground">Total Startups</div>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{selectionCount}</div>
            <div className="text-sm text-muted-foreground">Selected</div>
          </div>
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">{autoSelectedCount}</div>
            <div className="text-sm text-muted-foreground">Auto-Selected</div>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{Math.max(0, 30 - selectionCount)}</div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <Button onClick={handleBulkSelectTopRanked} disabled={isReadOnly}>
            <Star className="w-4 h-4 mr-2" />
            Auto-Select Top Ranked
          </Button>
          <Button variant="outline" onClick={handleClearSelections} disabled={isReadOnly}>
            Clear All
          </Button>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {selectionCount > 0 && `${selectionCount} startups selected`}
            </div>
            <div className="text-xs text-muted-foreground">
              Use the "Confirm Selection" button above to finalize your choices
            </div>
          </div>
        </div>

        {/* Startup Selection List */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b border-border">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">Select</div>
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Startup</div>
              <div className="col-span-1">Stage</div>
              <div className="col-span-1">Region</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-1">Evals</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {startups.map(startup => (
              <div key={startup.id} className={`px-4 py-3 transition-colors ${
                startup.isSelected ? 'bg-success/5 border-success/20' : 'hover:bg-muted/50'
              }`}>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <Checkbox
                      checked={startup.isSelected}
                      onCheckedChange={() => handleToggleSelection(startup.id)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      {startup.rank <= 30 && <Trophy className="w-4 h-4 text-warning" />}
                      <span className="font-medium">{startup.rank}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{startup.name}</h4>
                        {startup.evaluationsCount === 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            <span className="text-xs text-warning font-medium">No Evaluations</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{startup.industry}</p>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Badge variant="outline">{startup.stage}</Badge>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm">{startup.region}</span>
                  </div>
                  <div className="col-span-2">
                    <div>
                      <div className="font-semibold text-lg">{startup.averageScore.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Total: {startup.totalScore.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm ${startup.evaluationsCount === 0 ? 'text-warning font-medium' : ''}`}>
                        {startup.evaluationsCount}
                      </span>
                      {startup.evaluationsCount === 0 && (
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      )}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex flex-col gap-1">
                      {startup.isSelected ? (
                        <Badge className="bg-success text-success-foreground">
                          {startup.isPreviouslySelected ? 'Previously Selected' : (startup.isAutoSelected ? 'Auto' : 'Manual')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Selected</Badge>
                      )}
                      
                      {/* Evaluation status warnings */}
                      {startup.evaluationsCount === 0 && (
                        <Badge variant="destructive" className="text-xs">
                          No Evaluations
                        </Badge>
                      )}
                      
                      {/* Status context based on startup's current status relative to round */}
                      {startup.status === 'shortlisted' && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
                      {startup.status === 'finalist' && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
                      {startup.status === 'under-review' && (
                        <Badge variant="default" className="text-xs">
                          Under Review
                        </Badge>
                      )}
                    </div>
                  </div>
                   <div className="col-span-1">
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button
                           variant="ghost"
                           size="sm"
                           className="w-full"
                           onClick={() => viewStartupEvaluations(startup.id)}
                         >
                           <Eye className="w-4 h-4" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>View evaluation details</p>
                       </TooltipContent>
                     </Tooltip>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {startups.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No startups available</h3>
            <p className="text-muted-foreground">
              No startups found for this round
            </p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Startup Evaluations Details Modal */}
    <Dialog open={!!selectedStartupForDetails} onOpenChange={() => setSelectedStartupForDetails(null)}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Startup Evaluation Details - {startups.find(s => s.id === selectedStartupForDetails)?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {startupEvaluations.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Evaluations Found</h3>
              <p className="text-muted-foreground">This startup has no juror assignments yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {startupEvaluations.map((assignment) => (
                <Card key={assignment.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{assignment.jurors?.name || 'Unknown Juror'}</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant={assignment.evaluation_status === 'submitted' ? 'default' : assignment.evaluation_status === 'draft' ? 'secondary' : 'outline'}>
                            {assignment.evaluation_status === 'submitted' ? 'Evaluation Complete' : assignment.evaluation_status === 'draft' ? 'In Progress' : 'Not Started'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {assignment.evaluation_status === 'submitted' 
                              ? 'Evaluation has been completed and submitted by the juror' 
                              : assignment.evaluation_status === 'draft'
                              ? 'Evaluation is in progress but not yet submitted'
                              : 'Juror has been assigned to startup but evaluation not started'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>
                      {assignment.jurors?.job_title} at {assignment.jurors?.company} • {assignment.jurors?.email}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assignment.evaluation_status === 'submitted' && assignment.overall_score && (
                      <div className="mb-3">
                        <p className="text-sm font-medium">Overall Score: <span className="text-lg font-bold text-primary">{assignment.overall_score}/10</span></p>
                      </div>
                    )}
                    
                    {assignment.strengths && assignment.strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium">Key Strengths:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {assignment.strengths.map((strength: string, index: number) => (
                            <li key={index}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedJurorEvaluation({
                          ...startups.find(s => s.id === selectedStartupForDetails),
                          evaluation_id: assignment.evaluation_id,
                          evaluation_status: assignment.evaluation_status || 'not_started',
                          evaluator_id: assignment.jurors?.user_id
                        })}
                        disabled={assignment.evaluation_status === 'not_started'}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Evaluation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Individual Juror Evaluation Modal */}
    {selectedJurorEvaluation && (
      <StartupEvaluationModal
        startup={{
          ...selectedJurorEvaluation,
          evaluation_id: selectedJurorEvaluation.evaluation_id,
          evaluation_status: selectedJurorEvaluation.evaluation_status
        }}
        open={!!selectedJurorEvaluation}
        onClose={() => setSelectedJurorEvaluation(null)}
        onEvaluationUpdate={() => {}} 
        mode="view"
        currentRound="screening"
      />
    )}
  </TooltipProvider>
  );
};