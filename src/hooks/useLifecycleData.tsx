import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Trophy } from "lucide-react";

interface LifecycleStage {
  stage: string;
  displayName: string;
  participantCount: number;
  emailsSent: number;
  isActive: boolean;
  hasIssues: boolean;
  icon: React.ReactNode;
}

interface LifecycleData {
  stages: LifecycleStage[];
  totalParticipants: number;
  completedParticipants: number;
}

export const useLifecycleData = () => {
  return useQuery({
    queryKey: ['lifecycle-data'],
    queryFn: async (): Promise<LifecycleData> => {
      // Fetch lifecycle participants data
      const { data: participantsData, error: participantsError } = await supabase
        .from('lifecycle_participants')
        .select(`
          lifecycle_stage,
          stage_status,
          participant_type
        `);

      if (participantsError) {
        throw new Error(`Failed to fetch lifecycle participants: ${participantsError.message}`);
      }

      // Fetch email communications data
      const { data: emailsData, error: emailsError } = await supabase
        .from('email_communications')
        .select(`
          id,
          status,
          email_templates!inner (
            lifecycle_stage
          )
        `);

      if (emailsError) {
        throw new Error(`Failed to fetch email communications: ${emailsError.message}`);
      }

      // Process the data into lifecycle stages
      const stageMap = new Map<string, {
        participantCount: number;
        emailsSent: number;
        hasIssues: boolean;
      }>();

      // Initialize stages
      ['screening', 'pitching', 'finals'].forEach(stage => {
        stageMap.set(stage, {
          participantCount: 0,
          emailsSent: 0,
          hasIssues: false
        });
      });

      // Count participants by stage
      participantsData?.forEach(participant => {
        const stage = stageMap.get(participant.lifecycle_stage);
        if (stage) {
          stage.participantCount++;
          if (participant.stage_status === 'failed') {
            stage.hasIssues = true;
          }
        }
      });

      // Count emails sent by stage
      emailsData?.forEach(email => {
        const lifecycleStage = email.email_templates.lifecycle_stage;
        if (lifecycleStage) {
          const stage = stageMap.get(lifecycleStage);
          if (stage && email.status === 'sent') {
            stage.emailsSent++;
          }
          if (stage && email.status === 'failed') {
            stage.hasIssues = true;
          }
        }
      });

      // Build stages array
      const stages: LifecycleStage[] = [
        {
          stage: 'screening',
          displayName: 'Screening Round',
          participantCount: stageMap.get('screening')?.participantCount || 0,
          emailsSent: stageMap.get('screening')?.emailsSent || 0,
          isActive: true, // Screening is usually active first
          hasIssues: stageMap.get('screening')?.hasIssues || false,
          icon: <Users className="h-6 w-6" />
        },
        {
          stage: 'pitching',
          displayName: 'Pitching Round', 
          participantCount: stageMap.get('pitching')?.participantCount || 0,
          emailsSent: stageMap.get('pitching')?.emailsSent || 0,
          isActive: (stageMap.get('pitching')?.participantCount || 0) > 0,
          hasIssues: stageMap.get('pitching')?.hasIssues || false,
          icon: <Mail className="h-6 w-6" />
        },
        {
          stage: 'finals',
          displayName: 'Finals',
          participantCount: stageMap.get('finals')?.participantCount || 0,
          emailsSent: stageMap.get('finals')?.emailsSent || 0,
          isActive: (stageMap.get('finals')?.participantCount || 0) > 0,
          hasIssues: stageMap.get('finals')?.hasIssues || false,
          icon: <Trophy className="h-6 w-6" />
        }
      ];

      const totalParticipants = stages.reduce((sum, stage) => sum + stage.participantCount, 0);
      const completedParticipants = participantsData?.filter(p => p.stage_status === 'completed').length || 0;

      return {
        stages,
        totalParticipants,
        completedParticipants
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};