import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserPlus, 
  Bell, 
  ClipboardList, 
  Trophy, 
  Calendar, 
  MessageSquare, 
  Award,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

interface CommunicationWorkflowViewProps {
  participantId: string;
  participantType: 'juror' | 'startup';
}

interface WorkflowStage {
  stage: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  entered_at?: string;
  completed_at?: string;
  next_action_due?: string;
}

export function CommunicationWorkflowView({ participantId, participantType }: CommunicationWorkflowViewProps) {
  
  const { data: workflowData, isLoading } = useQuery({
    queryKey: ["communication-workflow", participantId, participantType],
    queryFn: async () => {
      // Get current workflow status
      const { data: workflow, error } = await supabase
        .from("communication_workflows")
        .select("*")
        .eq("participant_id", participantId)
        .eq("participant_type", participantType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching workflow:', error);
        return null;
      }

      return workflow;
    },
  });

  const getWorkflowStages = () => {
    const jurorStages = [
      { key: 'juror_onboarding', title: 'Juror Onboarding', description: 'Invitation sent and signup completed', icon: UserPlus },
      { key: 'assignment_notification', title: 'Assignment Notification', description: 'Notified of startup assignments', icon: Bell },
      { key: 'evaluation_reminders', title: 'Evaluation Reminders', description: 'Reminders for pending evaluations', icon: ClipboardList },
      { key: 'screening_results', title: 'Screening Results', description: 'Results and feedback shared', icon: Trophy },
      { key: 'pitching_assignment', title: 'Pitching Assignment', description: 'Assigned to pitch sessions', icon: Calendar },
      { key: 'pitch_reminders', title: 'Pitch Reminders', description: 'Reminders for pitch sessions', icon: MessageSquare },
      { key: 'final_results', title: 'Final Results', description: 'Final competition results', icon: Award },
    ];

    const startupStages = [
      { key: 'screening_results', title: 'Screening Results', description: 'Initial evaluation results', icon: Trophy },
      { key: 'pitching_assignment', title: 'Pitching Invitation', description: 'Invited to pitch sessions', icon: Calendar },
      { key: 'pitch_reminders', title: 'Pitch Reminders', description: 'Reminders about upcoming pitches', icon: MessageSquare },
      { key: 'final_results', title: 'Final Results', description: 'Competition outcome and feedback', icon: Award },
    ];

    return participantType === 'juror' ? jurorStages : startupStages;
  };

  const getStageStatus = (stageKey: string): 'completed' | 'in_progress' | 'pending' | 'failed' => {
    if (!workflowData) return 'pending';

    if (workflowData.current_stage === stageKey) {
      return workflowData.stage_status as 'completed' | 'in_progress' | 'pending' | 'failed';
    }

    // Check if this stage comes before the current stage
    const stages = getWorkflowStages();
    const currentIndex = stages.findIndex(s => s.key === workflowData.current_stage);
    const stageIndex = stages.findIndex(s => s.key === stageKey);

    if (stageIndex < currentIndex) {
      return 'completed';
    }

    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const calculateProgress = () => {
    const stages = getWorkflowStages();
    const completedStages = stages.filter(stage => getStageStatus(stage.key) === 'completed').length;
    return (completedStages / stages.length) * 100;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Workflow</CardTitle>
          <CardDescription>Loading workflow status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stages = getWorkflowStages();
  const progress = calculateProgress();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Communication Lifecycle</CardTitle>
            <CardDescription>
              Track {participantType} progress through the communication workflow
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.key);
            const Icon = stage.icon;
            
            return (
              <div key={stage.key} className="flex items-start gap-4 p-4 rounded-lg border">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-green-100' :
                    status === 'in_progress' ? 'bg-blue-100' :
                    status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      status === 'completed' ? 'text-green-600' :
                      status === 'in_progress' ? 'text-blue-600' :
                      status === 'failed' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">{stage.title}</h4>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      {getStatusBadge(status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{stage.description}</p>
                  
                  {/* Show timing information if available */}
                  {workflowData && workflowData.current_stage === stage.key && (
                    <div className="text-xs text-muted-foreground">
                      {workflowData.stage_entered_at && (
                        <div>Started: {new Date(workflowData.stage_entered_at).toLocaleString()}</div>
                      )}
                      {workflowData.next_action_due && status !== 'completed' && (
                        <div>Next action due: {new Date(workflowData.next_action_due).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {workflowData && workflowData.stage_status === 'failed' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Action Required</span>
            </div>
            <p className="text-sm text-red-600 mb-3">
              The current communication stage has failed. Manual intervention may be required.
            </p>
            <Button size="sm" variant="outline">
              Retry Communication
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}