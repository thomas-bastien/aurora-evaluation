import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UniversalCommunicationModal } from '../communication/UniversalCommunicationModal';

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

interface AssignmentNotificationModalProps {
  open: boolean;
  onClose: () => void;
  currentRound: 'screeningRound' | 'pitchingRound';
  assignments: Assignment[];
  onSendNotifications: (filters: { excludeAlreadyNotified: boolean }) => Promise<void>;
}

export const AssignmentNotificationModal = ({ 
  open, 
  onClose, 
  currentRound, 
  assignments,
  onSendNotifications 
}: AssignmentNotificationModalProps) => {
  const [notificationStats, setNotificationStats] = useState({
    totalJurors: 0,
    totalAssignments: 0,
    newNotifications: 0,
    alreadyNotified: 0,
    estimatedEmails: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      calculateNotificationStats();
    }
  }, [open, assignments]);

  const calculateNotificationStats = async () => {
    setLoading(true);
    try {
      // Group assignments by juror
      const jurorAssignments = new Map<string, Assignment[]>();
      assignments.forEach(assignment => {
        if (!jurorAssignments.has(assignment.juror_id)) {
          jurorAssignments.set(assignment.juror_id, []);
        }
        jurorAssignments.get(assignment.juror_id)!.push(assignment);
      });

      const totalJurors = jurorAssignments.size;
      const totalAssignments = assignments.length;

      // Query existing assignment notifications
      const { data: existingNotifications, error } = await supabase
        .from('email_communications')
        .select('recipient_id, metadata')
        .eq('recipient_type', 'juror')
        .eq('communication_type', 'assignment-notification')
        .in('recipient_id', Array.from(jurorAssignments.keys()));

      if (error) throw error;

      const jurorPreviousNotifications = new Map<string, Set<string>>();
      existingNotifications?.forEach(notification => {
        const jurorId = notification.recipient_id;
        const metadata = notification.metadata as any;
        const startupNames = metadata?.variables?.startupNames;
        
        if (startupNames && jurorId) {
          if (!jurorPreviousNotifications.has(jurorId)) {
            jurorPreviousNotifications.set(jurorId, new Set());
          }
          const previousStartups = startupNames.split(', ');
          previousStartups.forEach((startupName: string) => {
            jurorPreviousNotifications.get(jurorId)!.add(startupName.trim());
          });
        }
      });

      let jurorsWithNewAssignments = 0;
      let jurorsAlreadyNotified = 0;

      for (const [jurorId, currentAssignments] of jurorAssignments) {
        const previouslyNotifiedStartups = jurorPreviousNotifications.get(jurorId) || new Set();
        const currentStartupNames = currentAssignments.map(a => a.startup_name);
        
        const hasNewAssignments = currentStartupNames.some(startupName => 
          !previouslyNotifiedStartups.has(startupName)
        );
        
        if (hasNewAssignments) {
          jurorsWithNewAssignments++;
        } else {
          jurorsAlreadyNotified++;
        }
      }

      setNotificationStats({
        totalJurors,
        totalAssignments,
        newNotifications: jurorsWithNewAssignments,
        alreadyNotified: jurorsAlreadyNotified,
        estimatedEmails: jurorsWithNewAssignments
      });
    } catch (error) {
      console.error('Error calculating notification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    await onSendNotifications({ excludeAlreadyNotified: true });
    onClose();
  };

  // Create mock juror participants for the universal modal
  const mockJurors = Array.from(new Set(assignments.map(a => a.juror_id))).map(jurorId => {
    const jurorAssignments = assignments.filter(a => a.juror_id === jurorId);
    return {
      id: jurorId,
      name: jurorAssignments[0]?.juror_name || 'Unknown',
      email: `${jurorAssignments[0]?.juror_name?.toLowerCase().replace(' ', '.')}@example.com`,
      company: 'Investment Firm',
      job_title: 'Partner',
      assignedCount: jurorAssignments.length,
      completedCount: 0,
      pendingCount: jurorAssignments.length,
      completionRate: 0
    };
  });

  return (
    <UniversalCommunicationModal
      open={open}
      onOpenChange={onClose}
      communicationType="assignment-notification"
      currentRound={currentRound}
      type="bulk"
      participants={mockJurors}
      statistics={{
        total: notificationStats.totalJurors,
        eligible: notificationStats.newNotifications,
        willSend: notificationStats.estimatedEmails,
        willSkip: notificationStats.alreadyNotified,
        skipReasons: notificationStats.alreadyNotified > 0 ? { 'already notified': notificationStats.alreadyNotified } : undefined
      }}
      onConfirm={handleConfirm}
      isLoading={loading}
    />
  );
};