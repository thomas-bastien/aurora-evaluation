import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StartupEvaluationModal } from "@/components/evaluation/StartupEvaluationModal";
import { 
  BarChart3, 
  Search, 
  ArrowUpDown, 
  CheckCircle, 
  Trophy, 
  Filter,
  Eye,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface StartupEvaluation {
  id: string;
  name: string;
  description: string;
  industry: string;
  stage: string;
  location: string;
  region: string;
  evaluationsReceived: number;
  totalAssigned: number;
  averageScore: number | null;
  totalScore: number;
  rank: number;
  status: string; // Business status from database (rejected, shortlisted, under-review, etc.)
  evaluationStatus?: 'completed' | 'in-progress' | 'pending'; // Evaluation progress status
  lastUpdated: string;
}

type SortField = 'rank' | 'name' | 'averageScore' | 'evaluationsReceived' | 'stage' | 'region';
type SortDirection = 'asc' | 'desc';

interface EvaluationProgressViewProps {
  currentRound?: string;
}

export const EvaluationProgressView = ({ currentRound = 'screening' }: EvaluationProgressViewProps) => {
  const { user, session, loading: authLoading } = useAuth();
  const [startups, setStartups] = useState<StartupEvaluation[]>([]);
  const [filteredStartups, setFilteredStartups] = useState<StartupEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [completionStats, setCompletionStats] = useState({
    totalEvaluations: 0,
    completedEvaluations: 0,
    completionRate: 0,
    averageScore: 0
  });
  const [selectedStartupForDetails, setSelectedStartupForDetails] = useState<string | null>(null);
  const [startupEvaluations, setStartupEvaluations] = useState<any[]>([]);
  const [selectedJurorEvaluation, setSelectedJurorEvaluation] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && user && session) {
      fetchEvaluationProgress();
    }
  }, [user, session, authLoading, currentRound]);

  useEffect(() => {
    filterAndSortStartups();
  }, [startups, searchTerm, stageFilter, regionFilter, statusFilter, sortField, sortDirection]);

  const fetchEvaluationProgress = async () => {
    if (!user || !session) {
      console.error('User not authenticated when fetching evaluation progress');
      setError('Authentication required to view evaluation data');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('Fetching evaluation progress for round:', currentRound);
      console.log('Current user:', user.id);
      console.log('Session valid:', !!session);

      // Determine which tables to use based on current round
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

      console.log('User role:', authTest?.role);

      // Fetch startups with their evaluations and assignments
      const { data: startupsData, error } = await supabase
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

      if (error) {
        console.error('Database query error:', error);
        throw error;
      }

      console.log('Raw startups data:', startupsData?.length, 'startups found');
      console.log('Sample startup data:', startupsData?.[0]);

      let totalEvaluations = 0;
      let completedEvaluations = 0;
      let totalScoreSum = 0;
      let validScoreCount = 0;

      const evaluationData: StartupEvaluation[] = startupsData?.map(startup => {
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
        
        // Use the actual startup status from the database instead of evaluation progress
        const businessStatus = startup.status || 'under-review';
        
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
          industry: startup.industry || 'N/A',
          stage: startup.stage || 'N/A',
          location: startup.location || 'N/A',
          region: startup.region || 'N/A',
          evaluationsReceived: submittedEvaluations.length,
          totalAssigned: assignments.length,
          averageScore,
          totalScore,
          rank: 0, // Will be set after sorting
          status: businessStatus as any, // Use actual startup business status
          evaluationStatus, // Keep evaluation progress separately
          lastUpdated
        };
      }) || [];

      // Sort by average score and assign ranks (startups with no evaluations go to bottom)
      const sortedStartups = evaluationData
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
      
      setCompletionStats({
        totalEvaluations,
        completedEvaluations,
        completionRate: totalEvaluations > 0 ? (completedEvaluations / totalEvaluations) * 100 : 0,
        averageScore: validScoreCount > 0 ? totalScoreSum / validScoreCount : 0
      });

    } catch (error: any) {
      console.error('Error fetching evaluation progress:', error);
      const errorMessage = error?.message || 'Failed to load evaluation progress';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortStartups = () => {
    let filtered = [...startups];

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(startup => 
        startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(startup => startup.stage === stageFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(startup => startup.region === regionFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(startup => startup.status === statusFilter);
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
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground">Rejected</Badge>;
      case 'shortlisted':
        return <Badge className="bg-success text-success-foreground">Selected</Badge>;
      case 'under-review':
        return <Badge className="bg-primary text-primary-foreground">Under Review</Badge>;
      case 'pending':
        return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
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
      toast.error('Failed to load startup evaluation details');
    }
  };

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
            <Button onClick={fetchEvaluationProgress} variant="outline">
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
            <p className="text-muted-foreground">Please log in to view evaluation data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueStages = [...new Set(startups.map(s => s.stage))].filter(s => s !== 'N/A');
  const uniqueRegions = [...new Set(startups.map(s => s.region))].filter(r => r !== 'N/A');

  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Evaluation Progress Overview
            </CardTitle>
            <CardDescription>
              Review all startup evaluations and rankings
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchEvaluationProgress}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search startups by name, industry, or description..."
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
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="shortlisted">Selected</SelectItem>
                <SelectItem value="under-review">Under Review</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{startups.length}</div>
            <div className="text-sm text-muted-foreground">Total Startups</div>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{completionStats.completionRate.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{completionStats.completedEvaluations}</div>
            <div className="text-sm text-muted-foreground">Completed Evaluations</div>
          </div>
          <div className="text-center p-4 bg-accent/10 rounded-lg">
            <div className="text-2xl font-bold text-accent">{completionStats.averageScore.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </div>
        </div>

        {/* Startup Rankings Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b border-border">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">
                <SortableHeader field="rank">Rank</SortableHeader>
              </div>
              <div className="col-span-3">
                <SortableHeader field="name">Startup</SortableHeader>
              </div>
              <div className="col-span-1">
                <SortableHeader field="stage">Stage</SortableHeader>
              </div>
              <div className="col-span-1">
                <SortableHeader field="region">Region</SortableHeader>
              </div>
              <div className="col-span-2">
                <SortableHeader field="evaluationsReceived">Evaluations</SortableHeader>
              </div>
              <div className="col-span-1">
                <SortableHeader field="averageScore">Avg Score</SortableHeader>
              </div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          <div className="divide-y divide-border">
            {filteredStartups.map(startup => (
              <div key={startup.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      {startup.rank <= 30 && <Trophy className="w-4 h-4 text-warning" />}
                      <span className="font-medium">{startup.rank}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{startup.name}</h4>
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
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(startup.evaluationsReceived / startup.totalAssigned) * 100} 
                        className="flex-1 h-2" 
                      />
                      <span className="text-sm font-medium">
                        {startup.evaluationsReceived}/{startup.totalAssigned}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className="font-semibold text-lg">
                      {startup.averageScore?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(startup.status)}
                  </div>
                  <div className="col-span-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => viewStartupEvaluations(startup.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {filteredStartups.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No startups found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
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