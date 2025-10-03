import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StartupDetailsModal } from "@/components/common/StartupDetailsModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge';
import { 
  BarChart3,
  Search,
  ArrowUpDown,
  CheckCircle,
  Trophy,
  Filter,
  Eye,
  RotateCcw,
  AlertCircle,
  XCircle,
  ExternalLink,
  Users,
  Mail, 
  Send, 
  MessageSquare 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useRounds, type Round } from "@/hooks/useRounds";

interface UnifiedStartupData {
  id: string;
  name: string;
  description: string;
  stage: string;
  location: string;
  verticals: string[];
  regions: string[];
  pitch_deck_url: string | null;
  demo_url: string | null;
  contact_email: string | null;
  founder_names: string[];
  website: string | null;
  status: string; // Business status
  // Round-specific status
  roundStatus: 'pending' | 'selected' | 'rejected' | 'under-review';
  // Evaluation metrics
  evaluationsReceived: number;
  totalAssigned: number;
  averageScore: number | null;
  totalScore: number;
  rank: number;
  // Selection state
  isSelected: boolean;
  // Status indicators
  evaluationStatus?: 'completed' | 'in-progress' | 'pending';
  lastUpdated: string;
}

type SortField = 'rank' | 'name' | 'averageScore' | 'evaluationsReceived' | 'stage' | 'region';
type SortDirection = 'asc' | 'desc';

interface UnifiedSelectionTableProps {
  currentRound: 'screening' | 'pitching';
  roundInfo?: Round;
  isReadOnly?: boolean;
  onSelectionChange?: (selectedCount: number) => void;
}

export const UnifiedSelectionTable = ({
  currentRound,
  roundInfo,
  isReadOnly = false,
  onSelectionChange
}: UnifiedSelectionTableProps) => {
  const { user, session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { validateRoundCompletion } = useRounds();
  
  const [startups, setStartups] = useState<UnifiedStartupData[]>([]);
  const [filteredStartups, setFilteredStartups] = useState<UnifiedStartupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Selection states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const startupsRef = useRef<UnifiedStartupData[]>([]);
  
  // Stats and details
  const [completionStats, setCompletionStats] = useState({
    totalStartups: 0,
    totalEvaluations: 0,
    completedEvaluations: 0,
    completionRate: 0,
    averageScore: 0,
    selectedCount: 0,
    rejectedCount: 0,
    pendingCount: 0
  });
  const [selectedStartupForDetails, setSelectedStartupForDetails] = useState<{ id: string; name: string } | null>(null);
  
  // Validation state
  const [validation, setValidation] = useState<{
    canComplete: boolean;
    issues: string[];
  }>({ canComplete: false, issues: [] });

  const fetchUnifiedData = useCallback(async () => {
    if (!user || !session) {
      console.error('User not authenticated when fetching unified data');
      setError('Authentication required to view data');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('Fetching unified data for round:', currentRound);

      // Determine table names based on current round
      const assignmentTable = currentRound === 'screening' ? 'screening_assignments' : 'pitching_assignments';
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';

      // Test auth context first
      const { data: authTest, error: authError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (authError) {
        console.error('Auth test failed:', authError);
        throw new Error(`Authentication check failed: ${authError.message}`);
      }

      // Build query with filtering for pitching round
      let startupsData, error;

      if (currentRound === 'pitching') {
        // For pitching round: ONLY show startups that were SELECTED in screening round
        const { data, error: queryError } = await supabase
          .from('startups')
          .select(`
            *,
            ${assignmentTable}!startup_id(id, status),
            ${evaluationTable}!startup_id(
              id,
              overall_score,
              status,
              updated_at
            ),
            startup_round_statuses!inner(
              status,
              rounds!inner(name)
            )
          `)
          .eq('startup_round_statuses.rounds.name', 'screening')
          .eq('startup_round_statuses.status', 'selected');
        
        startupsData = data;
        error = queryError;
        console.log('Filtering for pitching round: only startups selected in screening round');
      } else {
        // For screening round: show ALL startups
        const { data, error: queryError } = await supabase
          .from('startups')
          .select(`
            *,
            ${assignmentTable}!startup_id(id, status),
            ${evaluationTable}!startup_id(
              id,
              overall_score,
              status,
              updated_at
            )
          `);
        
        startupsData = data;
        error = queryError;
        console.log('Showing all startups for screening round');
      }

      if (error) {
        console.error('Database query error:', error);
        throw error;
      }

      // Get round-specific statuses from startup_round_statuses table
      const { data: roundStatusesData, error: roundStatusError } = await supabase
        .from('startup_round_statuses')
        .select(`
          startup_id,
          status,
          rounds!inner(name)
        `)
        .eq('rounds.name', currentRound);

      if (roundStatusError) throw roundStatusError;

      // Create a map of startup IDs to their round-specific statuses
      const roundStatusMap = new Map();
      roundStatusesData?.forEach(rs => {
        roundStatusMap.set(rs.startup_id, rs.status);
      });

      console.log(`Raw startups data:`, startupsData?.length, 'startups found');

      let totalEvaluations = 0;
      let completedEvaluations = 0;
      let totalScoreSum = 0;
      let validScoreCount = 0;
      let selectedCount = 0;
      let rejectedCount = 0;
      let pendingCount = 0;

      const unifiedData: UnifiedStartupData[] = startupsData?.map(startup => {
        const assignmentKey = currentRound === 'screening' ? 'screening_assignments' : 'pitching_assignments';
        const evaluationKey = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
        
        const assignments = startup[assignmentKey] || [];
        const evaluations = startup[evaluationKey] || [];
        const submittedEvaluations = evaluations.filter((e: any) => e.status === 'submitted');
        
        totalEvaluations += assignments.length;
        completedEvaluations += submittedEvaluations.length;
        
        const scores = submittedEvaluations
          .map((e: any) => e.overall_score)
          .filter((score: any) => score !== null) as number[];
        
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : null;
        
        if (averageScore !== null) {
          totalScoreSum += averageScore;
          validScoreCount++;
        }
        
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        // Use the actual startup round status from the database
        const roundStatus = roundStatusMap.get(startup.id) || 'pending';
        
        // Count statuses
        if (roundStatus === 'selected') selectedCount++;
        else if (roundStatus === 'rejected') rejectedCount++;
        else pendingCount++;
        
        // Keep evaluation progress as a separate indicator
        let evaluationStatus: 'completed' | 'in-progress' | 'pending' = 'pending';
        if (submittedEvaluations.length === assignments.length && assignments.length > 0) {
          evaluationStatus = 'completed';
        } else if (submittedEvaluations.length > 0) {
          evaluationStatus = 'in-progress';
        }
        
        const lastUpdated = evaluations
          .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at || startup.updated_at;
        
        return {
          id: startup.id,
          name: startup.name,
          description: startup.description || '',
          stage: startup.stage || 'N/A',
          location: startup.location || 'N/A',
          verticals: startup.verticals || [],
          regions: startup.regions && startup.regions.length > 0 ? startup.regions : (startup.region ? [startup.region] : []),
          pitch_deck_url: startup.pitch_deck_url,
          demo_url: startup.demo_url,
          contact_email: startup.contact_email,
          founder_names: startup.founder_names || [],
          website: startup.website,
          status: startup.status || 'pending',
          roundStatus: roundStatus as any,
          evaluationsReceived: submittedEvaluations.length,
          totalAssigned: assignments.length,
          averageScore,
          totalScore,
          rank: 0, // Will be set after sorting
          isSelected: false,
          evaluationStatus,
          lastUpdated
        };
      }) || [];

      // Sort by average score and assign ranks (startups with no evaluations go to bottom)
      const sortedStartups = unifiedData
        .sort((a, b) => {
          // If one has no evaluations and the other does, put no-evaluation at bottom
          if (a.averageScore === null && b.averageScore !== null) return 1;
          if (b.averageScore === null && a.averageScore !== null) return -1;
          if (a.averageScore === null && b.averageScore === null) return 0;
          // Otherwise sort by average score (higher scores first)
          return b.averageScore - a.averageScore;
        })
        .map((startup, index) => ({ ...startup, rank: index + 1 }));

      setStartups(sortedStartups);
      startupsRef.current = sortedStartups;
      
      setCompletionStats({
        totalStartups: sortedStartups.length,
        totalEvaluations,
        completedEvaluations,
        completionRate: totalEvaluations > 0 ? (completedEvaluations / totalEvaluations) * 100 : 0,
        averageScore: validScoreCount > 0 ? totalScoreSum / validScoreCount : 0,
        selectedCount,
        rejectedCount,
        pendingCount
      });

      console.log(`Unified data loaded: ${sortedStartups.length} startups`);
      console.log('Status distribution:', { selectedCount, rejectedCount, pendingCount });

    } catch (error: any) {
      console.error('Error fetching unified data:', error);
      const errorMessage = error?.message || 'Failed to load data';
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, session, currentRound, toast]);

  const filterAndSortStartups = useCallback(() => {
    let filtered = [...startups];

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(startup => 
        startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.verticals.join(', ').toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(startup => startup.stage === stageFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(startup => 
        startup.regions.some(r => r === regionFilter)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(startup => startup.roundStatus === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'averageScore') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredStartups(filtered);
  }, [startups, searchTerm, stageFilter, regionFilter, statusFilter, sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

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

  const handleSelectAll = useCallback(() => {
    if (isReadOnly) return;
    
    const hasSelection = filteredStartups.some(s => s.isSelected);
    const updatedStartups = startups.map(startup => ({
      ...startup,
      isSelected: filteredStartups.includes(startup) ? !hasSelection : startup.isSelected
    }));
    
    setStartups(updatedStartups);
    startupsRef.current = updatedStartups;
    
    const selectedCount = updatedStartups.filter(s => s.isSelected).length;
    onSelectionChange?.(selectedCount);
  }, [startups, filteredStartups, isReadOnly, onSelectionChange]);

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
      await fetchUnifiedData();
      setShowConfirmDialog(false);
      
    } catch (error: any) {
      console.error('Error confirming selection:', error);
      toast({ title: "Error", description: `Failed to confirm selection: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentRound, toast, fetchUnifiedData]);

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
      await fetchUnifiedData();
      setShowRejectDialog(false);
      
    } catch (error: any) {
      console.error('Error rejecting startups:', error);
      toast({ title: "Error", description: `Failed to reject startups: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [startups, currentRound, toast, fetchUnifiedData]);

  const viewStartupDetails = useCallback((startup: UnifiedStartupData) => {
    setSelectedStartupForDetails({ id: startup.id, name: startup.name });
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    return <StatusBadge status={status} roundName={currentRound} />;
  }, [currentRound]);

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
    if (!authLoading && user && session) {
      fetchUnifiedData();
    }
  }, [user, session, authLoading, fetchUnifiedData]);

  useEffect(() => {
    filterAndSortStartups();
  }, [filterAndSortStartups]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-primary transition-colors"
    >
      {children}
      <ArrowUpDown className="w-4 h-4" />
    </button>
  );

  if (authLoading || loading) {
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

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={fetchUnifiedData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user || !session) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">Please log in to view data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueStages = [...new Set(startups.map(s => s.stage))].filter(s => s !== 'N/A');
  const uniqueRegions = [...new Set(
    startups.flatMap(s => s.regions)
  )];
  const selectedCount = startups.filter(s => s.isSelected).length;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {currentRound === 'screening' ? 'Screening Round Selection' : 'Pitching Round Selection'}
              </CardTitle>
              <CardDescription>
                Review evaluations, make selections, and track progress
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchUnifiedData}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search startups by name, verticals, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {uniqueStages.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {uniqueRegions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Round Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{completionStats.totalStartups}</div>
              <div className="text-sm text-muted-foreground">Total Startups</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{completionStats.completionRate.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{completionStats.completedEvaluations}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{completionStats.averageScore.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Score</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{completionStats.selectedCount}</div>
              <div className="text-sm text-green-600">Selected</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{completionStats.rejectedCount}</div>
              <div className="text-sm text-red-600">Rejected</div>
            </div>
          </div>

          {/* Selection Actions */}
          {!isReadOnly && (
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedCount} startup{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={filteredStartups.length === 0}
                  >
                    {filteredStartups.some(s => s.isSelected) ? 'Deselect' : 'Select'} All Visible
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelections}
                    disabled={selectedCount === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={selectedCount === 0}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Bulk Reject ({selectedCount})
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={selectedCount === 0}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Selection ({selectedCount})
                </Button>
              </div>
            </div>
          )}

          {/* Unified Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {!isReadOnly && (
                      <th className="p-4 text-left w-12">
                        <Checkbox
                          checked={filteredStartups.length > 0 && filteredStartups.every(s => s.isSelected)}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th className="p-4 text-left">
                      <SortableHeader field="rank">Rank</SortableHeader>
                    </th>
                    <th className="p-4 text-left">
                      <SortableHeader field="name">Startup Name</SortableHeader>
                    </th>
                    <th className="p-4 text-left">
                      <SortableHeader field="stage">Stage</SortableHeader>
                    </th>
                    <th className="p-4 text-left">
                      <SortableHeader field="region">Region</SortableHeader>
                    </th>
                    <th className="p-4 text-left">
                      <SortableHeader field="evaluationsReceived">Evaluations</SortableHeader>
                    </th>
                    <th className="p-4 text-left">
                      <SortableHeader field="averageScore">Avg Score</SortableHeader>
                    </th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStartups.map((startup) => (
                    <tr key={startup.id} className="border-b hover:bg-muted/30 transition-colors">
                      {!isReadOnly && (
                        <td className="p-4">
                          <Checkbox
                            checked={startup.isSelected}
                            onCheckedChange={() => handleToggleSelection(startup.id)}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{startup.rank}</span>
                          {startup.rank <= 10 && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{startup.name}</div>
                          <div className="text-sm text-muted-foreground">{startup.verticals.join(', ') || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {startup.stage}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{startup.regions.join(', ') || 'N/A'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {startup.evaluationsReceived}/{startup.totalAssigned}
                          </span>
                          <Progress 
                            value={(startup.evaluationsReceived / (startup.totalAssigned || 1)) * 100} 
                            className="w-16 h-2"
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {startup.averageScore !== null ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span 
                                  className={`px-2 py-1 rounded text-xs font-mono ${
                                    startup.averageScore >= 8 ? 'bg-green-100 text-green-800' :
                                    startup.averageScore >= 6 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {formatScore(startup.averageScore)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Total Score: {startup.totalScore}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-xs">No scores</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(startup.roundStatus)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewStartupDetails(startup)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/startup/${startup.id}`, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Startup Profile</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredStartups.length === 0 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">No startups found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search term</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Selection</DialogTitle>
            <DialogDescription>
              Are you sure you want to confirm the selection of {selectedCount} startup{selectedCount !== 1 ? 's' : ''}?
              {currentRound === 'screening' && ' They will advance to the Pitching Round.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSelection}>
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedCount} startup{selectedCount !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkReject}>
              Reject Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Startup Details Modal */}
      <StartupDetailsModal
        startup={selectedStartupForDetails}
        open={!!selectedStartupForDetails}
        currentRound={currentRound}
        onClose={() => setSelectedStartupForDetails(null)}
      />
    </TooltipProvider>
  );
};
