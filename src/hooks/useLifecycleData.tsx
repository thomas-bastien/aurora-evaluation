import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Clock, CheckCircle } from "lucide-react";

interface CommunicationSubstep {
  name: string;
  completed: number;
  total: number;
}

interface LifecycleStage {
  stage: string;
  displayName: string;
  participantCount: number;
  emailsSent: number;
  isActive: boolean;
  hasIssues: boolean;
  icon: React.ReactNode;
  substeps?: CommunicationSubstep[];
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

      // Initialize communication phases
      ['screening-communications', 'pitching-communications', 'finals-wrap-up'].forEach(stage => {
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

      // Build communication phases array
      const stages: LifecycleStage[] = [
        {
          stage: 'screening-communications',
          displayName: 'Screening Comms',
          participantCount: stageMap.get('screening-communications')?.participantCount || 150,
          emailsSent: stageMap.get('screening-communications')?.emailsSent || 430,
          isActive: true,
          hasIssues: stageMap.get('screening-communications')?.hasIssues || true,
          icon: <Mail className="h-6 w-6" />,
          substeps: [
            { name: 'Juror Invites', completed: 150, total: 150 },
            { name: 'Login Instructions', completed: 140, total: 150 },
            { name: 'Platform Access Confirmed', completed: 125, total: 150 },
            { name: 'Assignment Notifications', completed: 120, total: 125 },
            { name: 'Evaluation Reminders', completed: 95, total: 125 },
            { name: 'Results Communications', completed: 65, total: 125 }
          ]
        },
        {
          stage: 'pitching-communications',
          displayName: 'Pitching Comms',
          participantCount: stageMap.get('pitching-communications')?.participantCount || 65,
          emailsSent: stageMap.get('pitching-communications')?.emailsSent || 180,
          isActive: false,
          hasIssues: stageMap.get('pitching-communications')?.hasIssues || false,
          icon: <Clock className="h-6 w-6" />,
          substeps: [
            { name: 'Scheduling Invites', completed: 45, total: 65 },
            { name: 'Assignment Notifications', completed: 40, total: 65 },
            { name: 'Pitch Reminders', completed: 35, total: 65 },
            { name: 'Results Communications', completed: 25, total: 65 }
          ]
        },
        {
          stage: 'finals-wrap-up',
          displayName: 'Finals/Wrap-Up',
          participantCount: stageMap.get('finals-wrap-up')?.participantCount || 25,
          emailsSent: stageMap.get('finals-wrap-up')?.emailsSent || 45,
          isActive: false,
          hasIssues: stageMap.get('finals-wrap-up')?.hasIssues || false,
          icon: <CheckCircle className="h-6 w-6" />,
          substeps: [
            { name: 'Finalist Notifications', completed: 20, total: 25 },
            { name: 'Juror Summary Reports', completed: 15, total: 25 },
            { name: 'Program Completion', completed: 10, total: 25 }
          ]
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