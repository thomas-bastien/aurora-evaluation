import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Star,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Eye,
  FileText,
  Users,
  Award,
  TrendingUp,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StartupEvaluationModal } from "@/components/evaluation/StartupEvaluationModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RoundStatusDisplay } from "@/components/common/RoundStatusDisplay";
import { useToast } from "@/hooks/use-toast";
import { useRounds, type Round } from "@/hooks/useRounds";

interface StartupSelection {
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
  // Round-specific status
  roundStatus: 'pending' | 'selected' | 'rejected' | 'under-review';
  // Evaluation data
  totalEvaluations: number;
  averageScore: number | null;
  totalScore: number | null;
  // Selection state
  rank: number;
  isSelected: boolean;
}

interface Top30SelectionProps {
  currentRound?: string;
  isReadOnly?: boolean;
  onSelectionChange?: (count: number) => void;
  onSetConfirmCallback?: (callback: (() => Promise<void>) | null) => void;
  roundInfo?: Round;
}

export const Top30Selection = ({ currentRound = 'screening', isReadOnly = false, onSelectionChange, onSetConfirmCallback, roundInfo }: Top30SelectionProps) => {
  const { toast } = useToast();
  const { completeRound, getRoundProgress, validateRoundCompletion } = useRounds();
  const [startups, setStartups] = useState<StartupSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'rank' | 'name' | 'averageScore'>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'selected' | 'rejected' | 'under-review'>('all');
  const [selectedForDetails, setSelectedForDetails] = useState<StartupSelection | null>(null);
  const [evaluationModalStartup, setEvaluationModalStartup] = useState<any>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);

  // Keep a ref to the current startups for use in callbacks
  const startupsRef = useRef(startups);
  startupsRef.current = startups;

  useEffect(() => {
    fetchStartupsForSelection();
    loadRoundData();
  }, [currentRound]);

  useEffect(() => {
    const count = startups.filter(s => s.isSelected).length;
    onSelectionChange?.(count);
  }, [startups, onSelectionChange]);

  useEffect(() => {
    onSetConfirmCallback?.(null); // Remove the old callback since we handle it internally now
  }, [onSetConfirmCallback]);

  const loadRoundData = async () => {
    if (roundInfo?.status === 'active') {
      const [progressData, validationData] = await Promise.all([
        getRoundProgress(currentRound),
        validateRoundCompletion(currentRound)
      ]);
      setProgress(progressData);
      setValidation(validationData);
    }
  };

  const handleCompleteRound = async () => {
    setCompleting(true);
    try {
      console.log('Starting round completion process');
      
      // First confirm selections
      await handleConfirmSelection();
      
      // Then complete the round
      console.log('Completing round');
      const success = await completeRound(currentRound);
      if (success) {
        setShowCompleteDialog(false);
        console.log('Round completed successfully');
      }
    } catch (error) {
      console.error('Error in round completion:', error);
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirmSelection = useCallback(async () => {
    try {
      setLoading(true);
      const selectedStartups = startupsRef.current.filter(s => s.isSelected);
      
      console.log('Confirming selection with round-specific statuses:', {
        selectedCount: selectedStartups.length,
        selectedIds: selectedStartups.map(s => s.id),
        currentRound
      });
      
      // Update round-specific statuses for selected startups
      if (selectedStartups.length > 0) {
        const updatePromises = selectedStartups.map(startup => 
          supabase.rpc('update_startup_status_for_round', {
            startup_uuid: startup.id,
            round_name: currentRound,
            new_status: 'selected'
          })
        );

        await Promise.all(updatePromises);

        // For screening round, also set pitching status to pending
        if (currentRound === 'screening') {
          const pitchingPromises = selectedStartups.map(startup => 
            supabase.rpc('update_startup_status_for_round', {
              startup_uuid: startup.id,
              round_name: 'pitching',
              new_status: 'pending'
            })
          );
          await Promise.all(pitchingPromises);
        }
      }
      
      const actionLabel = currentRound === 'screening' ? 'selected for Pitching Round' : 'selected as Finalists';
      toast({ title: "Success", description: `Successfully ${actionLabel}: ${selectedStartups.length} startups` });
      
      // Refresh the data to show updated statuses
      await fetchStartupsForSelection();
      
    } catch (error: any) {
      console.error('Error confirming selection:', error);
      toast({ title: "Error", description: `Failed to confirm selection: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentRound, toast]);

  const fetchStartupsForSelection = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching startups for selection, currentRound:', currentRound);

      // First get the evaluation table name based on current round
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      
      console.log('Using tables:', { evaluationTable });

      // Fetch startups with evaluation data and round-specific status
      const { data: startupsData, error: startupsError } = await supabase
        .from('startups')
        .select(`
          id,
          name,
          description,
          verticals,
          stage,
          regions,
          pitch_deck_url,
          demo_url,
          contact_email,
          founder_names,
          website,
          status
        `)
        .order('name');

      if (startupsError) {
        console.error('Error fetching startups:', startupsError);
        throw startupsError;
      }

      console.log(`Fetched ${startupsData?.length || 0} startups`);

      // Fetch round-specific statuses
      const { data: roundStatusData, error: roundStatusError } = await supabase
        .from('startup_round_statuses')
        .select(`
          startup_id,
          status,
          rounds!inner(name)
        `)
        .eq('rounds.name', currentRound);

      if (roundStatusError) {
        console.error('Error fetching round statuses:', roundStatusError);
        throw roundStatusError;
      }

      // Create a lookup for round statuses
      const statusLookup = roundStatusData?.reduce((acc, item) => {
        acc[item.startup_id] = item.status as 'pending' | 'selected' | 'rejected' | 'under-review';
        return acc;
      }, {} as Record<string, 'pending' | 'selected' | 'rejected' | 'under-review'>) || {};

      // Fetch evaluations for the current round
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from(evaluationTable)
        .select('startup_id, overall_score, status')
        .eq('status', 'submitted');

      if (evaluationsError) {
        console.error('Error fetching evaluations:', evaluationsError);
        throw evaluationsError;
      }

      console.log(`Fetched ${evaluationsData?.length || 0} evaluations from ${evaluationTable}`);

      // Group evaluations by startup
      const evaluationsByStartup = evaluationsData?.reduce((acc, evaluation) => {
        if (!acc[evaluation.startup_id]) {
          acc[evaluation.startup_id] = [];
        }
        acc[evaluation.startup_id].push(evaluation);
        return acc;
      }, {} as Record<string, any[]>) || {};

      console.log('Evaluations grouped by startup:', Object.keys(evaluationsByStartup).length);

      // Calculate scores and create startup selection objects
      const startupsWithScores: StartupSelection[] = (startupsData || []).map(startup => {
        const evaluations = evaluationsByStartup[startup.id] || [];
        const scores = evaluations
          .map(e => e.overall_score)
          .filter(score => score !== null && score !== undefined);

        const totalScore = scores.reduce((sum, score) => sum + parseFloat(score.toString()), 0);
        const averageScore = scores.length > 0 ? totalScore / scores.length : null;
        const roundStatus = statusLookup[startup.id] || 'pending';

        return {
          ...startup,
          roundStatus,
          totalEvaluations: evaluations.length,
          averageScore,
          totalScore,
          rank: 0, // Will be set after sorting
          isSelected: false
        };
      });

      // For pitching round, only show startups that were selected in screening
      let filteredStartups = startupsWithScores;
      if (currentRound === 'pitching') {
        // Get startups that were selected in screening round
        const { data: screeningSelected, error: screeningError } = await supabase
          .from('startup_round_statuses')
          .select(`
            startup_id,
            rounds!inner(name)
          `)
          .eq('rounds.name', 'screening')
          .eq('status', 'selected');

        if (!screeningError && screeningSelected) {
          const selectedStartupIds = new Set(screeningSelected.map(s => s.startup_id));
          filteredStartups = startupsWithScores.filter(s => selectedStartupIds.has(s.id));
        }
      }

      // Sort by average score (descending) and assign ranks
      const sortedStartups = filteredStartups
        .filter(s => s.averageScore !== null) // Only include startups with scores
        .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
        .map((startup, index) => ({
          ...startup,
          rank: index + 1
        }));

      console.log(`Processed ${sortedStartups.length} startups with evaluation scores for ${currentRound} round`);
      
      setStartups(sortedStartups);
      
    } catch (error) {
      console.error('Error in fetchStartupsForSelection:', error);
      toast({ title: "Error", description: 'Failed to fetch startups data', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSelectTopRanked = () => {
    const updatedStartups = startups.map(startup => ({
      ...startup,
      isSelected: startup.rank <= 30
    }));
    setStartups(updatedStartups);
    toast({ title: "Success", description: 'Auto-selected top 30 startups' });
  };

  const handleToggleSelection = (startupId: string) => {
    setStartups(prev => prev.map(startup =>
      startup.id === startupId
        ? { ...startup, isSelected: !startup.isSelected }
        : startup
    ));
  };

  const handleClearSelections = () => {
    setStartups(prev => prev.map(startup => ({
      ...startup,
      isSelected: false
    })));
    toast({ title: "Success", description: 'Cleared all selections' });
  };

  const handleSort = (field: 'rank' | 'name' | 'averageScore') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort and filter startups
  const filteredAndSortedStartups = [...startups]
    .filter(startup => {
      if (statusFilter === 'all') return true;
      return startup.roundStatus === statusFilter;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'averageScore':
          aValue = a.averageScore || 0;
          bValue = b.averageScore || 0;
          break;
        case 'rank':
        default:
          aValue = a.rank;
          bValue = b.rank;
          break;
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const selectedCount = startups.filter(s => s.isSelected).length;
  const autoSelectedCount = Math.min(30, filteredAndSortedStartups.length);
  const remainingSlots = 30 - selectedCount;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Startups...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            {currentRound === 'screening' ? 'Select Startups for Pitching Round' : 'Select Final Startups'}
          </CardTitle>
          <CardDescription>
            {currentRound === 'screening' 
              ? 'Review evaluation results and select startups to advance to the pitching round'
              : 'Review pitch results and select the final startups'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Summary and Filter Controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {currentRound === 'screening' ? 'Select Startups for Pitching Round' : 'Select Final Startups'}
              </h3>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>Total: {startups.length} startups</span>
                <span>Selected: {selectedCount}</span>
                <span>Auto-Selected: {autoSelectedCount}</span>
                <span className={remainingSlots < 0 ? 'text-red-600' : 'text-green-600'}>
                  {remainingSlots < 0 ? `Over by ${Math.abs(remainingSlots)}` : `Remaining: ${remainingSlots}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'selected' | 'rejected' | 'under-review') => setStatusFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <Button 
              onClick={handleBulkSelectTopRanked} 
              disabled={isReadOnly || startups.length === 0}
            >
              <Star className="w-4 h-4 mr-2" />
              Auto-Select Top 30
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClearSelections} 
              disabled={isReadOnly || selectedCount === 0}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <Button 
              variant="ghost" 
              onClick={fetchStartupsForSelection}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            {/* Confirm Selection Button */}
            {roundInfo?.status === 'active' && !isReadOnly && (
              <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={selectedCount === 0 || !validation?.canComplete}
                    size="default"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Selection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Selection & Complete Round</DialogTitle>
                    <DialogDescription>
                      <div className="space-y-4">
                        <p>
                          This will confirm your selection of <strong>{selectedCount} startups</strong> and complete the {currentRound} round.
                        </p>
                        
                        <div className="bg-primary/10 p-3 rounded-md">
                          <p className="text-sm font-medium text-primary">
                            Selection Summary: {selectedCount} startups will advance to {currentRound === 'screening' ? 'pitching' : 'final selection'}
                          </p>
                        </div>
                        
                        <p>This action will:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Update startup statuses (selected → 'shortlisted', unselected → 'rejected')</li>
                          <li>Lock all {currentRound} evaluations and prevent further changes</li>
                          <li>Mark the {currentRound} round as completed</li>
                          {currentRound === 'screening' && <li>Activate the pitching round for selected startups</li>}
                          {currentRound === 'pitching' && <li>Finalize the evaluation process</li>}
                        </ul>
                        
                        <div className="p-3 bg-warning/10 rounded-md">
                          <p className="text-sm font-medium text-warning-foreground">
                            ⚠️ This action cannot be undone
                          </p>
                        </div>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCompleteRound} disabled={completing}>
                      {completing ? 'Processing...' : 'Confirm Selection & Complete Round'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Round Validation Status */}
          {roundInfo?.status === 'active' && validation && !validation.canComplete && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Requirements not met:</strong> {validation.reason}
              </AlertDescription>
            </Alert>
          )}

          {roundInfo?.status === 'active' && validation?.canComplete && (
            <Alert className="border-success bg-success/5 mb-6">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-foreground">
                All requirements met! This round is ready to be completed.
              </AlertDescription>
            </Alert>
          )}

          {/* Startup List */}
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-muted rounded-lg text-sm font-medium text-muted-foreground">
              <div className="col-span-1">Select</div>
              <div className="col-span-1 cursor-pointer flex items-center gap-1" onClick={() => handleSort('rank')}>
                Rank
                <ArrowUpDown className="w-3 h-3" />
              </div>
              <div className="col-span-3 cursor-pointer flex items-center gap-1" onClick={() => handleSort('name')}>
                Startup
                <ArrowUpDown className="w-3 h-3" />
              </div>
              <div className="col-span-2">Details</div>
              <div className="col-span-2 cursor-pointer flex items-center gap-1" onClick={() => handleSort('averageScore')}>
                Score
                <ArrowUpDown className="w-3 h-3" />
              </div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Startup Rows */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAndSortedStartups.map(startup => (
                <div 
                  key={startup.id} 
                  className={`grid grid-cols-12 gap-3 px-4 py-3 border border-border rounded-lg transition-colors ${
                    startup.isSelected ? 'bg-green-50 border-green-200' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    <Checkbox
                      checked={startup.isSelected}
                      onCheckedChange={() => handleToggleSelection(startup.id)}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <div className="text-2xl font-bold text-primary">#{startup.rank}</div>
                  </div>

                  <div className="col-span-3 flex items-center">
                    <div>
                      <h3 className="font-semibold text-foreground">{startup.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {startup.stage || 'Unknown'}
                        </Badge>
                        {startup.averageScore && (
                          <Badge variant="secondary" className="text-xs">
                            Score: {startup.averageScore.toFixed(1)}/10
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground">
                      <div>Stage: {startup.stage || 'N/A'}</div>
                      <div>Regions: {startup.regions?.join(', ') || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {startup.averageScore?.toFixed(1) || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {startup.totalEvaluations} evaluations
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <StatusBadge status={startup.roundStatus} />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedForDetails(startup)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredAndSortedStartups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No startups found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Startup Details Modal */}
      {selectedForDetails && (
        <Dialog open={!!selectedForDetails} onOpenChange={() => setSelectedForDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedForDetails.name} - Detailed Information
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Stage:</span> {selectedForDetails.stage || 'Not specified'}</div>
                    <div><span className="font-medium">Regions:</span> {selectedForDetails.regions?.join(', ') || 'Not specified'}</div>
                    <div><span className="font-medium">Verticals:</span> {selectedForDetails.verticals?.join(', ') || 'Not specified'}</div>
                    <div><span className="font-medium">Contact:</span> {selectedForDetails.contact_email || 'Not provided'}</div>
                    {selectedForDetails.website && (
                      <div><span className="font-medium">Website:</span> 
                        <a href={selectedForDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                          {selectedForDetails.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedForDetails.description || 'No description available'}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Founders</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedForDetails.founder_names?.length > 0 ? (
                      selectedForDetails.founder_names.map((founder, index) => (
                        <Badge key={index} variant="secondary">{founder}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No founders listed</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Evaluation & Status */}
              <div className="space-y-4">
                <RoundStatusDisplay 
                  screeningStatus={selectedForDetails.roundStatus}
                  pitchingStatus={selectedForDetails.roundStatus} 
                />

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Evaluation Results
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rank:</span>
                      <Badge variant="outline" className="font-bold">#{selectedForDetails.rank}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Evaluations:</span>
                      <Badge variant="secondary">{selectedForDetails.totalEvaluations}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Score:</span>
                      <Badge variant="default" className="font-bold">
                        {selectedForDetails.averageScore?.toFixed(1) || 'N/A'}/10
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Score:</span>
                      <Badge variant="outline">
                        {selectedForDetails.totalScore?.toFixed(1) || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEvaluationModalStartup(selectedForDetails)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Individual Evaluations
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Resources</h4>
                  <div className="space-y-2">
                    {selectedForDetails.pitch_deck_url && (
                      <a
                        href={selectedForDetails.pitch_deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        Pitch Deck
                      </a>
                    )}
                    {selectedForDetails.demo_url && (
                      <a
                        href={selectedForDetails.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        Demo
                      </a>
                    )}
                    {!selectedForDetails.pitch_deck_url && !selectedForDetails.demo_url && (
                      <span className="text-sm text-muted-foreground">No resources available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Evaluation Modal */}
      {evaluationModalStartup && (
        <StartupEvaluationModal
          startup={evaluationModalStartup}
          open={!!evaluationModalStartup}
          onClose={() => setEvaluationModalStartup(null)}
          onEvaluationUpdate={() => {}}
          currentRound={currentRound as 'screening' | 'pitching'}
        />
      )}
    </div>
  );
};
