// Top30Selection component for startup selection workflow
import { useState, useEffect, useCallback, useRef } from 'react';
import { formatScore } from '@/lib/utils';
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
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Eye,
  FileText,
  Users,
  Award,
  TrendingUp,
  ArrowUpDown,
  XCircle,
  Clock,
  Filter,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CMStartupEvaluationsView } from "@/components/cm/CMStartupEvaluationsView";
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
  // Evaluation metrics
  averageScore: number | null;
  totalScore: number | null;
  totalEvaluations: number;
  // Selection state
  isSelected: boolean;
  rank: number;
}

interface Top30SelectionProps {
  currentRound: 'screening' | 'pitching';
  roundInfo?: Round;
  isReadOnly?: boolean;
  onSelectionChange?: (selectedCount: number) => void;
  onCompleteRound?: () => void;
}

export const Top30Selection = ({ currentRound, roundInfo, isReadOnly = false, onSelectionChange, onCompleteRound }: Top30SelectionProps) => {
  const [startups, setStartups] = useState<StartupSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'averageScore' | 'name' | 'rank'>('averageScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'selected' | 'rejected' | 'under-review'>('all');
  const [selectedForDetails, setSelectedForDetails] = useState<StartupSelection | null>(null);
  const [evaluationModalStartup, setEvaluationModalStartup] = useState<StartupSelection | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const startupsRef = useRef<StartupSelection[]>([]);
  const { toast } = useToast();
  const { validateRoundCompletion } = useRounds();

  // Validation state for round completion
  const [validation, setValidation] = useState<{
    canComplete: boolean;
    issues: string[];
  }>({ canComplete: false, issues: [] });

  const fetchStartupsForSelection = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Fetching startups for selection, currentRound:', currentRound);

      // First get the evaluation table name based on current round
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      
      console.log('Using tables:', { evaluationTable });

      // Fetch startups with filtering for pitching round
      let startupsData, startupsError;
      
      if (currentRound === 'pitching') {
        // For pitching round: ONLY show startups that were SELECTED in screening round
        const { data, error } = await supabase
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
            status,
            startup_round_statuses!inner(
              status,
              rounds!inner(name)
            )
          `)
          .eq('startup_round_statuses.rounds.name', 'screening')
          .eq('startup_round_statuses.status', 'selected')
          .order('name');
        
        startupsData = data;
        startupsError = error;
        console.log('Filtering for pitching round: only startups selected in screening round');
      } else {
        // For screening round: show ALL startups
        const { data, error } = await supabase
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
        
        startupsData = data;
        startupsError = error;
        console.log('Showing all startups for screening round');
      }

      if (startupsError) {
        console.error('Error fetching startups:', startupsError);
        throw startupsError;
      }

      console.log(`Fetched ${startupsData?.length || 0} startups${currentRound === 'pitching' ? ' (selected in screening only)' : ' (all)'}`);

      // Fetch round-specific statuses for the current round
      const { data: roundStatusData, error: roundStatusError } = await supabase
        .from('startup_round_statuses')
        .select(`
          startup_id,
          status,
          rounds!inner(name)
        `)
        .eq('rounds.name', currentRound)
        .in('startup_id', startupsData?.map(s => s.id) || []);

      if (roundStatusError) {
        console.error('Error fetching round statuses:', roundStatusError);
        throw roundStatusError;
      }

      console.log(`Fetched ${roundStatusData?.length || 0} round statuses for ${currentRound} round`);

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

      // Process evaluation data to calculate averages and totals
      const evaluationStats = evaluationsData?.reduce((acc, evaluation) => {
        const startupId = evaluation.startup_id;
        if (!acc[startupId]) {
          acc[startupId] = { scores: [], totalScore: 0, count: 0 };
        }
        if (evaluation.overall_score) {
          acc[startupId].scores.push(evaluation.overall_score);
          acc[startupId].totalScore += evaluation.overall_score;
          acc[startupId].count += 1;
        }
        return acc;
      }, {} as Record<string, {scores: number[], totalScore: number, count: number}>) || {};

      // Combine all data and create startup selection objects
      const mappedStartups: StartupSelection[] = startupsData?.map((startup, index) => {
        const stats = evaluationStats[startup.id] || { scores: [], totalScore: 0, count: 0 };
        const averageScore = stats.count > 0 ? stats.totalScore / stats.count : null;
        const roundStatus = statusLookup[startup.id] || 'pending';

        return {
          id: startup.id,
          name: startup.name,
          description: startup.description,
          verticals: startup.verticals || [],
          stage: startup.stage,
          regions: startup.regions || [],
          pitch_deck_url: startup.pitch_deck_url,
          demo_url: startup.demo_url,
          contact_email: startup.contact_email,
          founder_names: startup.founder_names || [],
          website: startup.website,
          status: startup.status || 'pending',
          roundStatus: roundStatus,
          averageScore: averageScore,
          totalScore: stats.totalScore,
          totalEvaluations: stats.count,
          isSelected: false, // Will be updated by selection logic
          rank: index + 1
        };
      }) || [];

      console.log(`Mapped ${mappedStartups.length} startups with evaluation data`);
      console.log('Sample mapped startup:', mappedStartups[0]);

      // Sort by average score (highest first), then by name for consistent ordering
      const sortedStartups = mappedStartups.sort((a, b) => {
        if (a.averageScore === null && b.averageScore === null) return a.name.localeCompare(b.name);
        if (a.averageScore === null) return 1;
        if (b.averageScore === null) return -1;
        if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
        return a.name.localeCompare(b.name);
      });

      // Update ranks based on sorted order
      sortedStartups.forEach((startup, index) => {
        startup.rank = index + 1;
      });

      setStartups(sortedStartups);
      startupsRef.current = sortedStartups;

      console.log(`Selection loaded: ${sortedStartups.length} startups`);
      console.log('Status distribution:', {
        pending: sortedStartups.filter(s => s.roundStatus === 'pending').length,
        underReview: sortedStartups.filter(s => s.roundStatus === 'under-review').length,
        selected: sortedStartups.filter(s => s.roundStatus === 'selected').length,
        rejected: sortedStartups.filter(s => s.roundStatus === 'rejected').length,
      });

    } catch (error: any) {
      console.error('Error fetching startups for selection:', error);
      toast({ title: "Error", description: "Failed to load startups for selection", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentRound, toast]);

  const handleBulkReject = useCallback(async () => {
    try {
      setLoading(true);
      
      const selectedStartups = startups.filter(s => s.isSelected);
      if (selectedStartups.length === 0) {
        toast({ title: "Warning", description: "No startups selected for rejection", variant: "destructive" });
        return;
      }

      console.log('Rejecting startups:', selectedStartups.map(s => s.name));
      
      const updatePromises = selectedStartups.map(startup => 
        supabase.rpc('update_startup_status_for_round', {
          startup_uuid: startup.id,
          round_name: currentRound,
          new_status: 'rejected'
        })
      );

      await Promise.all(updatePromises);
      
      toast({ title: "Success", description: `Successfully rejected ${selectedStartups.length} startups` });
      
      // Refresh the data to show updated statuses
      await fetchStartupsForSelection();
      
    } catch (error: any) {
      console.error('Error rejecting startups:', error);
      toast({ title: "Error", description: `Failed to reject startups: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [startups, currentRound, toast, fetchStartupsForSelection]);



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
  }, [currentRound, toast, fetchStartupsForSelection]);


  const handleToggleSelection = useCallback((startupId: string) => {
    if (isReadOnly) return;
    
    const updatedStartups = startups.map(startup => 
      startup.id === startupId 
        ? { ...startup, isSelected: !startup.isSelected }
        : startup
    );
    
    setStartups(updatedStartups);
    startupsRef.current = updatedStartups;
    
    const selectedCount = updatedStartups.filter(s => s.isSelected).length;
    onSelectionChange?.(selectedCount);
  }, [startups, isReadOnly, onSelectionChange]);

  const handleClearSelections = useCallback(() => {
    if (isReadOnly) return;
    
    const updatedStartups = startups.map(startup => ({
      ...startup,
      isSelected: false
    }));
    
    setStartups(updatedStartups);
    startupsRef.current = updatedStartups;
    
    onSelectionChange?.(0);
    toast({ title: "Success", description: "Cleared all selections" });
  }, [startups, isReadOnly, onSelectionChange, toast]);

  const handleSort = useCallback((field: 'averageScore' | 'name' | 'rank') => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    
    const sortedStartups = [...startups].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (field) {
        case 'averageScore':
          aValue = a.averageScore ?? -1;
          bValue = b.averageScore ?? -1;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        default:
          return 0;
      }
      
      if (field === 'name') {
        return newOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return newOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    setStartups(sortedStartups);
    startupsRef.current = sortedStartups;
  }, [startups, sortBy, sortOrder]);

  // Validation effect
  useEffect(() => {
    const validateData = async () => {
      if (!roundInfo?.name) return;
      
      try {
        const result = await validateRoundCompletion(roundInfo.name);
        setValidation({ 
          canComplete: result.canComplete, 
          issues: result.reason ? [result.reason] : []
        });
      } catch (error) {
        console.error('Error validating round completion:', error);
        setValidation({ canComplete: false, issues: ['Validation failed'] });
      }
    };
    
    validateData();
  }, [roundInfo?.name, validateRoundCompletion, startups]);

  useEffect(() => {
    fetchStartupsForSelection();
  }, [fetchStartupsForSelection]);

  // Filter and display logic
  const filteredAndSortedStartups = startups.filter(startup => {
    if (statusFilter === 'all') return true;
    return startup.roundStatus === statusFilter;
  });

  const selectedCount = startups.filter(s => s.isSelected).length;
  const autoSelectedCount = Math.min(30, startups.length);
  const remainingSlots = autoSelectedCount - selectedCount;

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
            <Users className="w-5 h-5" />
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
              variant="outline" 
              onClick={handleClearSelections} 
              disabled={isReadOnly || selectedCount === 0}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            
            {/* Bulk Reject Button */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isReadOnly || selectedCount === 0}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as Rejected
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Rejection</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to reject {selectedCount} selected startup{selectedCount !== 1 ? 's' : ''}? 
                    {currentRound === 'screening' ? ' They will not advance to the pitching round.' : ' They will not be selected as finalists.'}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={async () => {
                      await handleBulkReject();
                      setShowRejectDialog(false);
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="ghost" 
              onClick={fetchStartupsForSelection}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            {/* Confirm Selection Button */}
            {roundInfo?.status !== 'completed' && !isReadOnly && (
              <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={selectedCount === 0 || !validation?.canComplete}
                    size="default"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Confirm Selection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Selection</DialogTitle>
                    <DialogDescription>
                      Confirm selection of {selectedCount} startups for {currentRound === 'screening' ? 'Pitching Round' : 'Final Selection'}?
                    </DialogDescription>
                  </DialogHeader>
                  
                  {validation.issues.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {validation.issues.map((issue, index) => (
                            <div key={index}>• {issue}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={async () => {
                        await handleConfirmSelection();
                        setShowCompleteDialog(false);
                        onCompleteRound?.();
                      }}
                      disabled={loading || !validation.canComplete}
                    >
                      {loading ? 'Confirming...' : 'Confirm Selection'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Startups List */}
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border rounded-lg bg-muted/50 font-medium text-sm">
              <div className="col-span-1 flex items-center justify-center">
                <Checkbox
                  checked={selectedCount > 0 && selectedCount === filteredAndSortedStartups.length}
                  onCheckedChange={(checked) => {
                    if (isReadOnly) return;
                    const updatedStartups = startups.map(startup => ({
                      ...startup,
                      isSelected: checked === true && filteredAndSortedStartups.some(f => f.id === startup.id)
                    }));
                    setStartups(updatedStartups);
                    startupsRef.current = updatedStartups;
                    onSelectionChange?.(updatedStartups.filter(s => s.isSelected).length);
                  }}
                />
              </div>
              <div className="col-span-1 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('rank')}
                  className="p-0 h-auto font-medium"
                >
                  Rank
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="col-span-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="p-0 h-auto font-medium"
                >
                  Startup Name
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="col-span-2">Stage & Region</div>
              <div className="col-span-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('averageScore')}
                  className="p-0 h-auto font-medium"
                >
                  Avg Score
                  <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            {/* Startup Rows */}
            <div className="space-y-2">
              {filteredAndSortedStartups.map((startup) => (
                <div 
                  key={startup.id} 
                  className="grid grid-cols-12 gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedForDetails(startup)}
                >
                  <div className="col-span-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={startup.isSelected}
                      onCheckedChange={() => handleToggleSelection(startup.id)}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <Badge variant="outline" className="w-fit">
                      #{startup.rank}
                    </Badge>
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
                            Score: {formatScore(startup.averageScore)}/10
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
                        {formatScore(startup.averageScore)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {startup.totalEvaluations} evaluations
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <StatusBadge status={startup.roundStatus} />
                  </div>

                  <div className="col-span-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedForDetails(startup);
                      }}
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
                    <div><span className="font-medium">Founders:</span> {selectedForDetails.founder_names?.join(', ') || 'Not specified'}</div>
                    {selectedForDetails.website && (
                      <div>
                        <span className="font-medium">Website:</span>{' '}
                        <a 
                          href={selectedForDetails.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
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
              </div>

              {/* Right Column - Evaluation Data */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Evaluation Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Score:</span>
                      <Badge variant="default" className="font-bold">
                        {formatScore(selectedForDetails.averageScore)}/10
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Score:</span>
                      <Badge variant="outline">
                        {formatScore(selectedForDetails.totalScore)}
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

      {/* CM Evaluations View */}
      {evaluationModalStartup && (
        <CMStartupEvaluationsView
          startup={{
            id: evaluationModalStartup.id,
            name: evaluationModalStartup.name,
            description: evaluationModalStartup.description
          }}
          open={!!evaluationModalStartup}
          onClose={() => setEvaluationModalStartup(null)}
          currentRound={currentRound}
        />
      )}
    </div>
  );
};
