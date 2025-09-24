import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

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
  const [excludeAlreadyNotified, setExcludeAlreadyNotified] = useState(true);
  const [notificationStats, setNotificationStats] = useState({
    totalJurors: 0,
    totalAssignments: 0,
    newNotifications: 0,
    alreadyNotified: 0,
    estimatedEmails: 0
  });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      calculateNotificationStats();
    }
  }, [open, assignments, excludeAlreadyNotified]);

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

      if (excludeAlreadyNotified) {
        // Query existing assignment notifications to identify jurors who already received notifications
        const { data: existingNotifications, error } = await supabase
          .from('email_communications')
          .select(`
            recipient_id,
            metadata,
            created_at
          `)
          .eq('recipient_type', 'juror')
          .eq('communication_type', 'assignment-notification')
          .in('recipient_id', Array.from(jurorAssignments.keys()));

        if (error) throw error;

        // Create a map to track previously notified startups for each juror
        const jurorPreviousNotifications = new Map<string, Set<string>>();
        
        existingNotifications?.forEach(notification => {
          const jurorId = notification.recipient_id;
          const metadata = notification.metadata as any;
          const startupNames = metadata?.variables?.startupNames;
          
          if (startupNames && jurorId) {
            if (!jurorPreviousNotifications.has(jurorId)) {
              jurorPreviousNotifications.set(jurorId, new Set());
            }
            
            // Parse startup names from previous notifications
            const previousStartups = startupNames.split(', ');
            previousStartups.forEach((startupName: string) => {
              jurorPreviousNotifications.get(jurorId)!.add(startupName.trim());
            });
          }
        });

        let jurorsWithNewAssignments = 0;
        let jurorsAlreadyNotified = 0;

        // Check each juror for new assignments
        for (const [jurorId, currentAssignments] of jurorAssignments) {
          const previouslyNotifiedStartups = jurorPreviousNotifications.get(jurorId) || new Set();
          const currentStartupNames = currentAssignments.map(a => a.startup_name);
          
          // Check if this juror has any new startups assigned since last notification
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
      } else {
        // Send to all jurors regardless of previous notifications
        setNotificationStats({
          totalJurors,
          totalAssignments,
          newNotifications: totalJurors,
          alreadyNotified: 0,
          estimatedEmails: totalJurors
        });
      }
    } catch (error) {
      console.error('Error calculating notification stats:', error);
      setNotificationStats({
        totalJurors: 0,
        totalAssignments: 0,
        newNotifications: 0,
        alreadyNotified: 0,
        estimatedEmails: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotifications = async () => {
    setSending(true);
    try {
      await onSendNotifications({ excludeAlreadyNotified });
      onClose();
    } catch (error) {
      console.error('Error sending notifications:', error);
    } finally {
      setSending(false);
    }
  };

  const roundName = currentRound === 'screeningRound' ? 'Screening' : 'Pitching';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Send assignment notifications now?
          </DialogTitle>
          <DialogDescription>
            This will send assignment notification emails to jurors informing them about their assigned startups for evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notification Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-foreground">Notification Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round:</span>
                <Badge variant="outline">{roundName}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Jurors:</span>
                <Badge variant="secondary">{loading ? '...' : notificationStats.totalJurors}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assignments:</span>
                <Badge variant="secondary">{loading ? '...' : notificationStats.totalAssignments}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emails:</span>
                <Badge variant="default">{loading ? '...' : notificationStats.estimatedEmails}</Badge>
              </div>
            </div>
            
            {excludeAlreadyNotified && notificationStats.newNotifications < notificationStats.totalJurors && (
              <div className="space-y-2 mt-3 pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New notifications:</span>
                  <Badge variant="default">{notificationStats.newNotifications}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already notified:</span>
                  <Badge variant="outline">{notificationStats.alreadyNotified}</Badge>
                </div>
              </div>
            )}

            {notificationStats.alreadyNotified > 0 && excludeAlreadyNotified && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                {notificationStats.alreadyNotified} jurors already have current assignments
              </div>
            )}
          </div>

          {/* Filter Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Filter Options</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-notified" 
                checked={excludeAlreadyNotified}
                onCheckedChange={(checked) => setExcludeAlreadyNotified(!!checked)}
              />
              <label htmlFor="exclude-notified" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Exclude already notified (only send to jurors with new assignments)
              </label>
            </div>
          </div>

          {notificationStats.estimatedEmails === 0 && !loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              No notifications to send with current filters
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendNotifications} 
            disabled={sending || notificationStats.estimatedEmails === 0 || loading}
          >
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {sending ? 'Sending...' : `Send ${notificationStats.estimatedEmails} Notifications`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};