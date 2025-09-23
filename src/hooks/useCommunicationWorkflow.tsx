import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkflowTriggerData {
  participantId: string;
  participantType: 'juror' | 'startup';
  eventType: string;
  eventData?: any;
}

export function useCommunicationWorkflow() {
  const queryClient = useQueryClient();

  // Trigger workflow event
  const triggerWorkflowEvent = useMutation({
    mutationFn: async (data: WorkflowTriggerData) => {
      const { error } = await supabase.functions.invoke('workflow-orchestrator', {
        body: data
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['communication-workflow'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['email-history'] });
    },
    onError: (error: any) => {
      toast.error(`Workflow error: ${error.message}`);
    },
  });

  // Get workflow status for a participant
  const getWorkflowStatus = (participantId: string, participantType: 'juror' | 'startup') => {
    return useQuery({
      queryKey: ['workflow-status', participantId, participantType],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_participant_workflow_status', {
          p_participant_id: participantId,
          p_participant_type: participantType
        });

        if (error) throw error;
        return data?.[0] || null;
      },
    });
  };

  // Get communication history for a participant
  const getCommunicationHistory = (participantId: string, participantType: 'juror' | 'startup') => {
    return useQuery({
      queryKey: ['communication-history', participantId, participantType],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('email_communications')
          .select(`
            *,
            email_templates (
              name,
              category
            )
          `)
          .eq('recipient_id', participantId)
          .eq('recipient_type', participantType)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
    });
  };

  // Get pending communications that need attention
  const getPendingCommunications = () => {
    return useQuery({
      queryKey: ['pending-communications'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('communication_attempts')
          .select(`
            *,
            communication_workflows (
              participant_id,
              participant_type,
              current_stage
            )
          `)
          .eq('attempt_status', 'pending')
          .lte('scheduled_at', new Date().toISOString());

        if (error) throw error;
        return data;
      },
      refetchInterval: 30000, // Refetch every 30 seconds
    });
  };

  // Advance workflow stage manually
  const advanceWorkflowStage = useMutation({
    mutationFn: async ({ 
      workflowId, 
      newStage, 
      stageData = {} 
    }: { 
      workflowId: string; 
      newStage: any; 
      stageData?: any; 
    }) => {
      const { error } = await supabase.rpc('advance_workflow_stage', {
        p_workflow_id: workflowId,
        p_new_stage: newStage,
        p_stage_data: stageData
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['communication-workflow'] });
      toast.success('Workflow stage advanced successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to advance workflow: ${error.message}`);
    },
  });

  // Complete workflow stage
  const completeWorkflowStage = useMutation({
    mutationFn: async ({ 
      workflowId, 
      completionData = {} 
    }: { 
      workflowId: string; 
      completionData?: any; 
    }) => {
      const { error } = await supabase.rpc('complete_workflow_stage', {
        p_workflow_id: workflowId,
        p_completion_data: completionData
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-status'] });
      queryClient.invalidateQueries({ queryKey: ['communication-workflow'] });
      toast.success('Workflow stage completed');
    },
    onError: (error: any) => {
      toast.error(`Failed to complete workflow stage: ${error.message}`);
    },
  });

  // Check for login reminders
  const checkLoginReminders = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('check-login-reminders');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-workflow'] });
      queryClient.invalidateQueries({ queryKey: ['email-history'] });
      toast.success('Login reminder check completed');
    },
    onError: (error: any) => {
      toast.error(`Login reminder check failed: ${error.message}`);
    },
  });

  return {
    triggerWorkflowEvent,
    getWorkflowStatus,
    getCommunicationHistory,
    getPendingCommunications,
    advanceWorkflowStage,
    completeWorkflowStage,
    checkLoginReminders,
  };
}