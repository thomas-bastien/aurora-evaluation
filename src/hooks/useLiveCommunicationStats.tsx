import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Clock, CheckCircle, Send, Phone, MessageSquare } from "lucide-react";

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

export const useLiveCommunicationStats = () => {
  return useQuery({
    queryKey: ['live-communication-stats'],
    queryFn: async (): Promise<LifecycleData> => {
      // Fetch email communications with detailed breakdown
      const { data: emailsData, error: emailsError } = await supabase
        .from('email_communications')
        .select(`
          communication_type,
          round_name,
          recipient_type,
          status,
          created_at
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (emailsError) {
        throw new Error(`Failed to fetch email communications: ${emailsError.message}`);
      }

      // Get participant counts
      const [jurorsResult, invitedJurorsResult, startupsResult] = await Promise.all([
        supabase.from('jurors').select('id', { count: 'exact' }),
        supabase
          .from('jurors')
          .select('id', { count: 'exact' })
          .not('invitation_sent_at', 'is', null),
        supabase.from('startups').select('id', { count: 'exact' })
      ]);

      const totalJurors = jurorsResult.count || 0;
      const invitedJurors = invitedJurorsResult.count || 0;
      const totalStartups = startupsResult.count || 0;

      // Calculate statistics by round and type
      const emailStats = new Map<string, { sent: number; failed: number; total: number }>();
      
      emailsData?.forEach(email => {
        const key = `${email.round_name || 'general'}-${email.communication_type || 'invitation'}-${email.recipient_type}`;
        const current = emailStats.get(key) || { sent: 0, failed: 0, total: 0 };
        
        current.total++;
        if (email.status === 'sent' || email.status === 'delivered') {
          current.sent++;
        } else if (email.status === 'failed') {
          current.failed++;
        }
        
        emailStats.set(key, current);
      });

      // Helper function to get stats for a specific key
      const getStats = (round: string, type: string, recipientType: string) => {
        return emailStats.get(`${round}-${type}-${recipientType}`) || { sent: 0, failed: 0, total: 0 };
      };

      // Calculate screening round substeps
      const screeningJurorInvites = getStats('general', 'invitation', 'juror');
      const screeningAssignments = getStats('screening', 'assignment', 'juror');
      const screeningReminders = getStats('screening', 'reminder', 'juror');
      const screeningResults = getStats('screening', 'selection', 'startup');
      const screeningRejections = getStats('screening', 'rejection', 'startup');
      const screeningUnderReview = getStats('screening', 'under-review', 'startup');

      // Calculate pitching round substeps  
      const pitchingAssignments = getStats('pitching', 'assignment', 'juror');
      const pitchingScheduling = getStats('pitching', 'pitch_scheduling', 'startup');
      const pitchingReminders = getStats('pitching', 'reminder', 'juror');
      const pitchingResults = getStats('pitching', 'selection', 'startup');
      const pitchingRejections = getStats('pitching', 'rejection', 'startup');

      // Determine active round based on recent activity
      const recentEmails = emailsData?.filter(e => 
        new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ) || [];
      
      const recentScreening = recentEmails.filter(e => e.round_name === 'screening').length;
      const recentPitching = recentEmails.filter(e => e.round_name === 'pitching').length;
      const activeRound = recentPitching > recentScreening ? 'pitching' : 'screening';

      const stages: LifecycleStage[] = [
        {
          stage: 'screening-communications',
          displayName: 'Screening Comms',
          participantCount: totalJurors + totalStartups,
          emailsSent: screeningJurorInvites.sent + screeningAssignments.sent + screeningResults.sent + screeningRejections.sent + screeningUnderReview.sent,
          isActive: activeRound === 'screening',
          hasIssues: screeningJurorInvites.failed > 0 || screeningAssignments.failed > 0 || screeningResults.failed > 0 || screeningRejections.failed > 0,
          icon: <Mail className="h-6 w-6" />,
          substeps: [
            { 
              name: 'Juror Invites', 
              completed: invitedJurors, 
              total: totalJurors
            },
            { 
              name: 'Assignment Notifications', 
              completed: screeningAssignments.sent, 
              total: Math.max(screeningAssignments.total, totalJurors)
            },
            { 
              name: 'Evaluation Reminders', 
              completed: screeningReminders.sent, 
              total: Math.max(screeningReminders.total, totalJurors)
            },
            { 
              name: 'Results Communications', 
              completed: screeningResults.sent + screeningRejections.sent + screeningUnderReview.sent, 
              total: Math.max(screeningResults.total + screeningRejections.total + screeningUnderReview.total, totalStartups)
            }
          ]
        },
        {
          stage: 'pitching-communications',
          displayName: 'Pitching Comms',
          participantCount: Math.floor(totalStartups * 0.3), // Approximately 30% advance to pitching
          emailsSent: pitchingAssignments.sent + pitchingScheduling.sent + pitchingResults.sent + pitchingRejections.sent,
          isActive: activeRound === 'pitching',
          hasIssues: pitchingAssignments.failed > 0 || pitchingScheduling.failed > 0 || pitchingResults.failed > 0 || pitchingRejections.failed > 0,
          icon: <Clock className="h-6 w-6" />,
          substeps: [
            { 
              name: 'Assignment Notifications', 
              completed: pitchingAssignments.sent, 
              total: Math.max(pitchingAssignments.total, Math.floor(totalJurors * 0.6))
            },
            { 
              name: 'Scheduling Invites', 
              completed: pitchingScheduling.sent, 
              total: Math.max(pitchingScheduling.total, Math.floor(totalStartups * 0.3))
            },
            { 
              name: 'Pitch Reminders', 
              completed: pitchingReminders.sent, 
              total: Math.max(pitchingReminders.total, Math.floor(totalJurors * 0.6))
            },
            { 
              name: 'Results Communications', 
              completed: pitchingResults.sent + pitchingRejections.sent, 
              total: Math.max(pitchingResults.total + pitchingRejections.total, Math.floor(totalStartups * 0.3))
            }
          ]
        },
        {
          stage: 'finals-wrap-up',
          displayName: 'Finals/Wrap-Up',
          participantCount: Math.floor(totalStartups * 0.1), // Approximately 10% make it to finals
          emailsSent: 0, // No finals emails yet in the system
          isActive: false,
          hasIssues: false,
          icon: <CheckCircle className="h-6 w-6" />,
          substeps: [
            { name: 'Finalist Notifications', completed: 0, total: Math.floor(totalStartups * 0.1) },
            { name: 'Juror Summary Reports', completed: 0, total: totalJurors },
            { name: 'Program Completion', completed: 0, total: Math.floor(totalStartups * 0.1) }
          ]
        }
      ];

      const totalParticipants = totalJurors + totalStartups;
      
      // Calculate completion based on successful email delivery rates
      const totalSentEmails = emailsData?.filter(e => e.status === 'sent' || e.status === 'delivered').length || 0;
      const totalEmailsExpected = totalJurors * 2 + totalStartups; // Rough estimate
      const completedParticipants = Math.floor((totalSentEmails / totalEmailsExpected) * totalParticipants);

      return {
        stages,
        totalParticipants,
        completedParticipants: Math.min(completedParticipants, totalParticipants)
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};