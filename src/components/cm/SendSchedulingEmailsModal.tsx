import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UniversalCommunicationModal } from '../communication/UniversalCommunicationModal';

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

interface SendSchedulingEmailsModalProps {
  open: boolean;
  onClose: () => void;
  currentRound: 'screeningRound' | 'pitchingRound';
  assignments: Assignment[];
  onSendEmails: (filters: { onlyConfirmed: boolean; excludeAlreadyEmailed: boolean; forceOverride?: boolean }) => Promise<void>;
}

export const SendSchedulingEmailsModal = ({ 
  open, 
  onClose, 
  currentRound, 
  assignments,
  onSendEmails 
}: SendSchedulingEmailsModalProps) => {
  const [emailStats, setEmailStats] = useState({
    totalStartups: 0,
    totalJurors: 0,
    estimatedEmails: 0,
    alreadyEmailed: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      calculateEmailStats();
    }
  }, [open, assignments]);

  const calculateEmailStats = async () => {
    setLoading(true);
    try {
      // Group assignments by startup
      const startupGroups = new Map<string, Assignment[]>();
      assignments.forEach(assignment => {
        if (!startupGroups.has(assignment.startup_id)) {
          startupGroups.set(assignment.startup_id, []);
        }
        startupGroups.get(assignment.startup_id)!.push(assignment);
      });

      // Get list of startups that already received emails for this round type
      const emailSubjectFilter = currentRound === 'screeningRound' 
        ? 'subject.ilike.%confirmation%,subject.ilike.%evaluation%'
        : 'subject.ilike.%scheduling%,subject.ilike.%pitch%';
        
      const { data: emailedStartups, error } = await supabase
        .from('email_communications')
        .select('recipient_id')
        .eq('recipient_type', 'startup')
        .or(emailSubjectFilter)
        .eq('status', 'sent');

      if (error) throw error;

      const emailedStartupIds = new Set(emailedStartups?.map(e => e.recipient_id) || []);
      const eligibleStartups = Array.from(startupGroups.keys()).filter(startupId => !emailedStartupIds.has(startupId));

      const uniqueJurors = new Set();
      eligibleStartups.forEach(startupId => {
        const startupAssignments = startupGroups.get(startupId) || [];
        startupAssignments.forEach(assignment => uniqueJurors.add(assignment.juror_id));
      });

      setEmailStats({
        totalStartups: eligibleStartups.length,
        totalJurors: uniqueJurors.size,
        estimatedEmails: eligibleStartups.length,
        alreadyEmailed: emailedStartupIds.size
      });
    } catch (error) {
      console.error('Error calculating email stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (forceOverride = false) => {
    await onSendEmails({ 
      onlyConfirmed: true, 
      excludeAlreadyEmailed: !forceOverride, 
      forceOverride 
    });
    onClose();
  };

  // Create mock participants for the universal modal
  const mockParticipants = assignments.map(assignment => ({
    id: assignment.startup_id,
    name: assignment.startup_name,
    email: `${assignment.startup_name}@example.com`, // Mock email
    industry: 'Technology', // Mock industry
    status: 'assigned'
  }));

  const hasSkippedStartups = emailStats.alreadyEmailed > 0;
  const totalPossible = emailStats.totalStartups + emailStats.alreadyEmailed;

  return (
    <UniversalCommunicationModal
      open={open}
      onOpenChange={onClose}
      communicationType="scheduling-email"
      currentRound={currentRound}
      type="bulk"
      participants={mockParticipants}
      statistics={{
        total: totalPossible,
        eligible: emailStats.totalStartups,
        willSend: emailStats.estimatedEmails,
        willSkip: emailStats.alreadyEmailed,
        skipReasons: emailStats.alreadyEmailed > 0 ? { 'already emailed': emailStats.alreadyEmailed } : undefined
      }}
      hasThrottleOverride={hasSkippedStartups}
      throttleMessage={hasSkippedStartups ? 
        `${emailStats.alreadyEmailed} startup${emailStats.alreadyEmailed !== 1 ? 's' : ''} will be skipped because they have already received scheduling emails. Use override to re-send emails to all startups.` 
        : undefined
      }
      onConfirm={handleConfirm}
      isLoading={loading}
    />
  );
};