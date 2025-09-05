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
  status: 'completed' | 'active' | 'behind' | 'inactive';
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

  useEffect(() => {
    fetchJurorProgress();
  }, []);

  useEffect(() => {
    filterJurors();
  }, [jurors, searchTerm, statusFilter]);

  const fetchJurorProgress = async () => {
    try {
      // Fetch jurors with their assignments and evaluations
      const { data: jurorsData, error } = await supabase
        .from('jurors')
        .select(`
          *,
          startup_assignments(
            id,
            startup_id,
            status
          )
        `);

      if (error) throw error;

      // Fetch all evaluations for these jurors (only those with user_id)
      const jurorUserIds = jurorsData?.filter(j => j.user_id).map(j => j.user_id) || [];
      let evaluationsData: any[] = [];
      
      if (jurorUserIds.length > 0) {
        const { data: evals, error: evalError } = await supabase
          .from('evaluations')
          .select('evaluator_id, status, last_modified_at')
          .in('evaluator_id', jurorUserIds);
          
        if (evalError) throw evalError;
        evaluationsData = evals || [];
      }


      const jurorProgress: JurorProgress[] = jurorsData?.map(juror => {
        const assignments = juror.startup_assignments || [];
        const assignedCount = assignments.length;
        
        // Get real evaluations for this juror (only if they have a user_id)
        const jurorEvaluations = juror.user_id 
          ? evaluationsData.filter(evaluation => evaluation.evaluator_id === juror.user_id)
          : [];
        const completedCount = jurorEvaluations.filter(evaluation => evaluation.status === 'submitted').length;
        const draftCount = jurorEvaluations.filter(evaluation => evaluation.status === 'draft').length;
        const pendingCount = assignedCount - completedCount - draftCount;
        const completionRate = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0;
        
        // Debug logging
        console.log(`Juror ${juror.name}:`, {
          assignedCount,
          completedCount,
          draftCount,
          pendingCount,
          completionRate,
          hasUserId: !!juror.user_id,
          evaluationsFound: jurorEvaluations.length
        });
        
        // Get last activity from evaluations
        const lastModified = jurorEvaluations
          .filter(evaluation => evaluation.last_modified_at)
          .sort((a, b) => new Date(b.last_modified_at!).getTime() - new Date(a.last_modified_at!).getTime())[0];
        
        // Determine status based on actual completion
        let status: 'completed' | 'active' | 'behind' | 'inactive' = 'inactive';
        if (assignedCount === 0) {
          status = 'inactive';
        } else if (completedCount === assignedCount) {
          status = 'completed';
        } else if (completedCount > 0 || draftCount > 0) {
          status = completedCount >= assignedCount * 0.5 ? 'active' : 'behind';
        } else {
          status = 'inactive';
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
          status
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
      filtered = filtered.filter(juror => juror.status === statusFilter);
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

      // Fetch juror's startup assignments with evaluation status
      const { data: assignments, error } = await supabase
        .from('startup_assignments')
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
        const { data: evalData, error: evalError } = await supabase
          .from('evaluations')
          .select('startup_id, status, id')
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
          evaluation_status: evaluation?.status || 'not_started'
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
    const incompleteJurors = filteredJurors.filter(j => j.status !== 'completed');
    
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

  const getStatusBadge = (status: string, completionRate: number) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'active':
        return <Badge className="bg-primary text-primary-foreground">Active</Badge>;
      case 'behind':
        return <Badge className="bg-warning text-warning-foreground">Behind</Badge>;
      case 'inactive':
        return <Badge className="bg-muted text-muted-foreground">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

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
              Juror Progress Monitoring - {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
            </CardTitle>
            <CardDescription>
              Track {currentRound === 'screeningRound' ? 'evaluation' : 'pitch'} submission status by juror and send reminders
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
                <option value="active">Active</option>
                <option value="behind">Behind</option>
                <option value="inactive">Inactive</option>
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
            <div className="text-2xl font-bold text-success">{jurors.filter(j => j.status === 'completed').length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">{jurors.filter(j => j.status === 'behind').length}</div>
            <div className="text-sm text-muted-foreground">Behind</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-muted-foreground">{jurors.filter(j => j.status === 'inactive').length}</div>
            <div className="text-sm text-muted-foreground">Inactive</div>
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
                      {getStatusBadge(juror.status, juror.completionRate)}
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
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{juror.completionRate.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={juror.completionRate} 
                      className="h-2"
                    />
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
                    disabled={juror.status === 'completed'}
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
                {jurorAssignments.map((assignment) => (
                  <Card key={assignment.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{assignment.startups?.name || 'Unknown Startup'}</CardTitle>
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
                ))}
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
        />
      )}
    </TooltipProvider>
  );
};