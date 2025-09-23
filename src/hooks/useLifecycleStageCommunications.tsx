import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StageCommunication {
  id: string;
  participantId: string;
  participantType: string;
  participantName: string;
  participantEmail: string;
  templateName: string;
  templateCategory: string;
  sentAt: string | null;
  status: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
}

export const useLifecycleStageCommunications = (stage: string) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['lifecycle-stage-communications', stage],
    queryFn: async (): Promise<StageCommunication[]> => {
      const { data: communications, error } = await supabase
        .from('email_communications')
        .select(`
          id,
          recipient_id,
          recipient_type,
          recipient_email,
          subject,
          sent_at,
          delivered_at,
          opened_at,
          clicked_at,
          bounced_at,
          status,
          email_templates!inner (
            name,
            category,
            lifecycle_stage
          )
        `)
        .eq('email_templates.lifecycle_stage', stage)
        .order('sent_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch communications: ${error.message}`);
      }

      // Get participant names for each communication
      const enrichedCommunications = await Promise.all(
        communications?.map(async (comm) => {
          const tableName = comm.recipient_type === 'startup' ? 'startups' : 'jurors';
          const nameField = comm.recipient_type === 'startup' ? 'name' : 'name';
          
          const { data: participant } = await supabase
            .from(tableName)
            .select(nameField)
            .eq('id', comm.recipient_id)
            .single();

          return {
            id: comm.id,
            participantId: comm.recipient_id,
            participantType: comm.recipient_type,
            participantName: participant?.[nameField] || 'Unknown',
            participantEmail: comm.recipient_email,
            templateName: comm.email_templates.name,
            templateCategory: comm.email_templates.category,
            sentAt: comm.sent_at,
            status: comm.status,
            deliveredAt: comm.delivered_at,
            openedAt: comm.opened_at,
            clickedAt: comm.clicked_at,
            bouncedAt: comm.bounced_at,
          };
        }) || []
      );

      return enrichedCommunications;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const triggerCommunicationMutation = useMutation({
    mutationFn: async ({ action, communicationId }: { action: string; communicationId?: string }) => {
      if (action === 'resend' && communicationId) {
        // Get the original communication details and resend
        const { data: originalComm, error } = await supabase
          .from('email_communications')
          .select('*')
          .eq('id', communicationId)
          .single();

        if (error) throw new Error(`Failed to fetch original communication: ${error.message}`);

        // Trigger resend via workflow orchestrator
        const { error: resendError } = await supabase.functions.invoke('lifecycle-orchestrator', {
          body: {
            eventType: 'manual_resend',
            participantId: originalComm.recipient_id,
            participantType: originalComm.recipient_type,
            lifecycleStage: stage,
            eventData: { originalCommunicationId: communicationId }
          }
        });

        if (resendError) throw resendError;

      } else {
        // Trigger bulk actions
        const { error } = await supabase.functions.invoke('lifecycle-orchestrator', {
          body: {
            eventType: action,
            participantId: 'bulk',
            participantType: 'mixed',
            lifecycleStage: stage,
            eventData: { bulkAction: true }
          }
        });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      const actionLabel = variables.action === 'resend' ? 'Email resent' : 'Communications triggered';
      toast.success(actionLabel, {
        description: `Successfully ${variables.action === 'resend' ? 'resent email' : 'triggered communications'} for ${stage} stage`
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['lifecycle-stage-communications'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-data'] });
    },
    onError: (error: Error) => {
      toast.error("Communication failed", {
        description: error.message
      });
    }
  });

  return {
    data,
    isLoading,
    error,
    triggerCommunication: (action: string, communicationId?: string) => 
      triggerCommunicationMutation.mutate({ action, communicationId }),
    isTriggering: triggerCommunicationMutation.isPending
  };
};