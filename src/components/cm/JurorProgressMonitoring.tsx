import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilterPanel } from "@/components/common/FilterPanel";
import { StartupEvaluationModal } from "@/components/evaluation/StartupEvaluationModal";
import { JurorStatusBadge } from '@/components/common/JuryRoundStatusBadges';
import { PitchingCallsList } from './PitchingCallsList';
import { calculateMultipleProgressiveJurorStatuses, type ProgressiveJurorStatus } from '@/utils/juryStatusUtils';
import { formatScore } from "@/lib/utils";
import { 
  Search, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Filter,
  RotateCcw,
  Eye
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface JurorProgress {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  assignedCount: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
  lastActivity: string;
  progressiveStatus: ProgressiveJurorStatus;
  user_id?: string; // Add user_id to interface
  // Pitching calls data (only populated during pitching round)
  pitchingAssignedCount?: number;
  pitchingScheduledCount?: number;
  pitchingCallsRate?: number;
}

interface JurorProgressMonitoringProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const JurorProgressMonitoring = ({ currentRound }: JurorProgressMonitoringProps) => {
  const [jurors, setJurors] = useState<JurorProgress[]>([]);
  const [filteredJurors, setFilteredJurors] = useState<JurorProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJurorForDetails, setSelectedJurorForDetails] = useState<string | null>(null);
  const [jurorAssignments, setJurorAssignments] = useState<any[]>([]);
  const [selectedStartupForEvaluation, setSelectedStartupForEvaluation] = useState<any>(null);

  const roundTitle = currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round';

  useEffect(() => {
    setLoading(true);
    fetchJurorProgress();
  }, [currentRound]);

  useEffect(() => {
    filterJurors();
  }, [jurors, searchTerm, statusFilter]);

  const fetchJurorProgress = async () => {
    try {
      // Fetch jurors with their assignments based on round
      const assignmentTable = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
      const { data: jurorsData, error } = await supabase
        .from('jurors')
        .select(`
          *,
          ${assignmentTable}(
            id,
            startup_id,
            status
          )
        `);

      if (error) throw error;

      // Calculate progressive statuses for all jurors
      const jurorIds = jurorsData?.map(j => j.id) || [];
      const jurorProgressiveStatuses = await calculateMultipleProgressiveJurorStatuses(jurorIds);

      // Fetch all evaluations for these jurors (only those with user_id)
      const jurorUserIds = jurorsData?.filter(j => j.user_id).map(j => j.user_id) || [];  
      let evaluationsData: any[] = [];
      
      if (jurorUserIds.length > 0) {
        const evaluationTable = currentRound === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
        const { data: evals, error: evalError } = await supabase
          .from(evaluationTable)
          .select('evaluator_id, startup_id, status, last_modified_at')
          .in('evaluator_id', jurorUserIds);
          
        if (evalError) throw evalError;
        evaluationsData = evals || [];
      }

      // Fetch pitching calls data if in pitching round
      let pitchRequestsData: any[] = [];
      let pitchingAssignmentsData: any[] = [];
      
      if (currentRound === 'pitchingRound' && jurorUserIds.length > 0) {
        const [pitchRequestsResponse, pitchingAssignmentsResponse] = await Promise.all([
          supabase
            .from('pitch_requests')
            .select('vc_id, startup_id, status')
            .in('vc_id', jurorUserIds),
          supabase
            .from('pitching_assignments')
            .select('juror_id, startup_id, status')
            .in('juror_id', jurorIds)
            .eq('status', 'assigned')
        ]);
        
        if (pitchRequestsResponse.error) throw pitchRequestsResponse.error;
        if (pitchingAssignmentsResponse.error) throw pitchingAssignmentsResponse.error;
        
        pitchRequestsData = pitchRequestsResponse.data || [];
        pitchingAssignmentsData = pitchingAssignmentsResponse.data || [];
      }

      const jurorProgress: JurorProgress[] = jurorsData?.map(juror => {
        const assignmentField = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
        const assignments = juror[assignmentField] || [];
        const assignedOnly = assignments.filter((a: any) => a.status === 'assigned');
        const assignedStartupIds = assignedOnly.map((a: any) => a.startup_id);
        const assignedCount = assignedOnly.length;
        
        // Get real evaluations for this juror in this round and only for assigned startups
        const jurorEvaluations = juror.user_id 
          ? evaluationsData.filter((evaluation: any) => evaluation.evaluator_id === juror.user_id && assignedStartupIds.includes(evaluation.startup_id))
          : [];
        const completedCount = jurorEvaluations.filter((evaluation: any) => evaluation.status === 'submitted').length;
        const draftCount = jurorEvaluations.filter((evaluation: any) => evaluation.status === 'draft').length;
        const pendingCount = Math.max(assignedCount - completedCount - draftCount, 0);
        const completionRate = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0;
        
        // Get last activity from evaluations
        const lastModified = jurorEvaluations
          .filter((evaluation: any) => evaluation.last_modified_at)
          .sort((a: any, b: any) => new Date(b.last_modified_at!).getTime() - new Date(a.last_modified_at!).getTime())[0];
        
        // Use progressive status from our calculation
        const progressiveStatus = jurorProgressiveStatuses[juror.id] || {
          status: 'pending',
          currentRound: 'screening',
          completedRounds: []
        };

        // Calculate pitching calls data if in pitching round
        let pitchingAssignedCount = 0;
        let pitchingScheduledCount = 0;
        let pitchingCallsRate = 0;

        if (currentRound === 'pitchingRound' && juror.user_id) {
          pitchingAssignedCount = assignedCount;
          const scheduledForJuror = pitchRequestsData.filter((pr: any) => pr.vc_id === juror.user_id && (pr.status === 'scheduled' || pr.status === 'completed'));
          pitchingScheduledCount = scheduledForJuror.filter((pr: any) => assignedStartupIds.includes(pr.startup_id)).length;
          pitchingCallsRate = pitchingAssignedCount > 0 ? (pitchingScheduledCount / pitchingAssignedCount) * 100 : 0;
        }
        
        return {
          id: juror.id,
          name: juror.name,
          email: juror.email,
          company: juror.company || 'N/A',
          job_title: juror.job_title || 'N/A',
          assignedCount,
          completedCount,
          pendingCount,
          completionRate,
          lastActivity: lastModified?.last_modified_at || 'Never',
          progressiveStatus,
          user_id: juror.user_id,
          pitchingAssignedCount,
          pitchingScheduledCount,
          pitchingCallsRate
        };
      }) || [];

      setJurors(jurorProgress);
    } catch (error) {
      console.error('Error fetching juror progress:', error);
      toast.error('Failed to load juror progress');
    } finally {
      setLoading(false);
    }
  };

  const filterJurors = () => {
    let filtered = jurors;

    if (searchTerm) {
      filtered = filtered.filter(juror => 
        juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        juror.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        juror.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(juror => juror.progressiveStatus.status === statusFilter);
    }

    setFilteredJurors(filtered);
  };

  const sendReminder = async (jurorId: string, email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-juror-reminder', {
        body: { jurorId, email }
      });

      if (error) throw error;

      toast.success('Reminder sent successfully');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    }
  };

  const viewJurorDetails = async (jurorId: string) => {
    try {
      // Get the juror's user_id first
      const { data: jurorData, error: jurorError } = await supabase
        .from('jurors')
        .select('user_id')
        .eq('id', jurorId)
        .single();

      if (jurorError) throw jurorError;

      // Fetch juror's startup assignments with evaluation status based on round
      const assignmentTable = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
      const { data: assignments, error } = await supabase
        .from(assignmentTable)
        .select(`
          *,
          startups (
            id,
            name,
            description,
            industry,
            stage,
            location,
            founder_names,
            pitch_deck_url
          )
        `)
        .eq('juror_id', jurorId);

      if (error) throw error;

      // Fetch evaluations for this juror to get real status (only if they have a user_id)
      let evaluations: any[] = [];
      if (jurorData.user_id) {
        const evaluationTable = currentRound === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
        const { data: evalData, error: evalError } = await supabase
          .from(evaluationTable)
          .select('startup_id, status, id, overall_score')
          .eq('evaluator_id', jurorData.user_id);

        if (evalError) throw evalError;
        evaluations = evalData || [];
      }

      // Enrich assignments with evaluation data
      const enrichedAssignments = assignments?.map(assignment => {
        const evaluation = evaluations?.find(evaluation => evaluation.startup_id === assignment.startup_id);
        return {
          ...assignment,
          evaluation_id: evaluation?.id,
          evaluation_status: evaluation?.status || 'not_started',
          evaluation_score: evaluation?.overall_score || null
        };
      }) || [];

      setJurorAssignments(enrichedAssignments);
      setSelectedJurorForDetails(jurorId);
    } catch (error) {
      console.error('Error fetching juror assignments:', error);
      toast.error('Failed to load juror details');
    }
  };

  const sendBulkReminders = async () => {
    const incompleteJurors = filteredJurors.filter(j => j.progressiveStatus.status !== 'completed');
    
    try {
      for (const juror of incompleteJurors) {
        await sendReminder(juror.id, juror.email);
      }
      toast.success(`Reminders sent to ${incompleteJurors.length} jurors`);
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast.error('Failed to send bulk reminders');
    }
  };

  const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';

  const getProgressColor = (rate: number) => {
    if (rate === 100) return "bg-success";
    if (rate >= 50) return "bg-primary";
    if (rate > 0) return "bg-warning";
    return "bg-muted";
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

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Monitor Jury Progress - {roundTitle}
            </CardTitle>
            <CardDescription>
              <div className="space-y-1">
                <p><strong>Community Manager Workflow:</strong> Track juror evaluation progress and send reminders.</p>
                <p className="text-sm">
                  {currentRound === 'screeningRound' 
                    ? 'Monitor which jurors have completed screening evaluations and follow up with those who are behind schedule.' 
                    : 'Track pitch call completion status and pitching evaluation submissions from jurors.'
                  }
                </p>
              </div>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button onClick={sendBulkReminders}>
              <Mail className="w-4 h-4 mr-2" />
              Send Reminders
            </Button>
            <Button variant="outline" onClick={fetchJurorProgress}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search jurors by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {showFilters && (
            <div className="p-4 border rounded-lg bg-muted">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="active">In Progress</option>
                <option value="pending">Pending</option>
                <option value="not_invited">Not Invited</option>
              </select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{jurors.length}</div>
            <div className="text-sm text-muted-foreground">Total Jurors</div>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{jurors.filter(j => j.progressiveStatus.status === 'completed').length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">{jurors.filter(j => j.progressiveStatus.status === 'active').length}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-muted-foreground">{jurors.filter(j => j.progressiveStatus.status === 'pending').length}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Juror List */}
        <div className="space-y-4">
          {filteredJurors.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jurors found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'No jurors have been assigned yet'}
              </p>
            </div>
          ) : (
            filteredJurors.map(juror => (
              <div key={juror.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-foreground">{juror.name}</h4>
                      <JurorStatusBadge jurorId={juror.id} progressiveStatus={juror.progressiveStatus} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {juror.job_title} at {juror.company} • {juror.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">
                      {juror.completedCount}/{juror.assignedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">evaluations</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1 space-y-3">
                    {/* Evaluation Progress - Always visible */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Evaluation Progress</span>
                        <span>{Math.round(juror.completionRate)}%</span>
                      </div>
                      <Progress 
                        value={juror.completionRate} 
                        className="h-2"
                      />
                    </div>
                    
                    {/* Pitching Calls Progress - Only visible during pitching round */}
                    {currentRound === 'pitchingRound' && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Pitching Calls Progress</span>
                          <span>{Math.round(juror.pitchingCallsRate || 0)}%</span>
                        </div>
                        <Progress 
                          value={juror.pitchingCallsRate || 0} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {juror.pitchingScheduledCount || 0}/{juror.pitchingAssignedCount || 0} calls scheduled
                        </div>
                        <PitchingCallsList jurorId={juror.id} jurorUserId={juror.user_id || ''} />
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {juror.lastActivity === 'Never' ? 'Never' : new Date(juror.lastActivity).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => sendReminder(juror.id, juror.email)}
                    disabled={juror.progressiveStatus.status === 'completed'}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => viewJurorDetails(juror.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>

      {/* Juror Details Modal */}
      <Dialog open={!!selectedJurorForDetails} onOpenChange={() => setSelectedJurorForDetails(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Juror Evaluation Details - {jurors.find(j => j.id === selectedJurorForDetails)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {jurorAssignments.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Assignments Found</h3>
                <p className="text-muted-foreground">This juror has no startup assignments yet.</p>
              </div>
            ) : (
                <div className="grid gap-4">
                {jurorAssignments.map((assignment) => {
                  const getScoreColor = (score: number | null) => {
                    if (!score) return "text-muted-foreground";
                    if (score >= 8) return "text-success";
                    if (score >= 6) return "text-primary";
                    if (score >= 4) return "text-warning";
                    return "text-destructive";
                  };
                  
                  return (
                    <Card key={assignment.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg">{assignment.startups?.name || 'Unknown Startup'}</CardTitle>
                            {assignment.evaluation_score !== null && (
                              <div className={`text-2xl font-bold ${getScoreColor(assignment.evaluation_score)}`}>
                                {formatScore(assignment.evaluation_score)}/10
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {assignment.evaluation_score === null && assignment.evaluation_status === 'submitted' && (
                              <Badge variant="outline" className="text-muted-foreground">No Score</Badge>
                            )}
                            {assignment.evaluation_score === null && assignment.evaluation_status !== 'submitted' && (
                              <Badge variant="outline" className="text-muted-foreground">Not Scored</Badge>
                            )}
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
                                    : 'Startup has been assigned to juror but evaluation not started'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <CardDescription>
                          {assignment.startups?.industry} • {assignment.startups?.stage} • {assignment.startups?.location}
                        </CardDescription>
                      </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {assignment.startups?.description || 'No description available'}
                      </p>
                      
                      {assignment.startups?.founder_names && (
                        <div className="mb-3">
                          <p className="text-sm font-medium">Founders:</p>
                          <p className="text-sm text-muted-foreground">
                            {Array.isArray(assignment.startups.founder_names) 
                              ? assignment.startups.founder_names.join(', ')
                              : assignment.startups.founder_names}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-4">
                        {assignment.startups?.pitch_deck_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={assignment.startups.pitch_deck_url} target="_blank" rel="noopener noreferrer">
                              View Pitch Deck
                            </a>
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedStartupForEvaluation({
                            ...assignment.startups,
                            evaluation_id: assignment.evaluation_id,
                            evaluation_status: assignment.evaluation_status || 'not_started'
                          })}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Evaluation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
                </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Startup Evaluation Modal */}
      {selectedStartupForEvaluation && (
        <StartupEvaluationModal
          startup={{
            ...selectedStartupForEvaluation,
            evaluation_id: selectedStartupForEvaluation.evaluation_id,
            evaluation_status: selectedStartupForEvaluation.evaluation_status
          }}
          open={!!selectedStartupForEvaluation}
          onClose={() => setSelectedStartupForEvaluation(null)}
          onEvaluationUpdate={() => {}} 
          mode="view"
          currentRound={currentRound === 'screeningRound' ? 'screening' : 'pitching'}
        />
      )}
    </TooltipProvider>
  );
};