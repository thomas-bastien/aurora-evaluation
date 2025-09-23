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

interface SendSchedulingEmailsModalProps {
  open: boolean;
  onClose: () => void;
  currentRound: 'screeningRound' | 'pitchingRound';
  assignments: Assignment[];
  onSendEmails: (filters: { onlyConfirmed: boolean; excludeAlreadyEmailed: boolean }) => Promise<void>;
}

export const SendSchedulingEmailsModal = ({ 
  open, 
  onClose, 
  currentRound, 
  assignments,
  onSendEmails 
}: SendSchedulingEmailsModalProps) => {
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);
  const [excludeAlreadyEmailed, setExcludeAlreadyEmailed] = useState(true);
  const [emailStats, setEmailStats] = useState({
    totalStartups: 0,
    totalJurors: 0,
    estimatedEmails: 0,
    alreadyEmailed: 0
  });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      calculateEmailStats();
    }
  }, [open, assignments, onlyConfirmed, excludeAlreadyEmailed]);

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

      let eligibleStartups = Array.from(startupGroups.keys());
      
      if (excludeAlreadyEmailed) {
        eligibleStartups = eligibleStartups.filter(startupId => !emailedStartupIds.has(startupId));
      }

      const uniqueJurors = new Set();
      eligibleStartups.forEach(startupId => {
        const startupAssignments = startupGroups.get(startupId) || [];
        startupAssignments.forEach(assignment => uniqueJurors.add(assignment.juror_id));
      });

      setEmailStats({
        totalStartups: eligibleStartups.length,
        totalJurors: uniqueJurors.size,
        estimatedEmails: eligibleStartups.length, // One email per startup
        alreadyEmailed: emailedStartupIds.size
      });
    } catch (error) {
      console.error('Error calculating email stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    setSending(true);
    try {
      await onSendEmails({ onlyConfirmed, excludeAlreadyEmailed });
      onClose();
    } catch (error) {
      console.error('Error sending emails:', error);
    } finally {
      setSending(false);
    }
  };

  const roundName = currentRound === 'screeningRound' ? 'Screening' : 'Pitching';
  const isScreeningRound = currentRound === 'screeningRound';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            {isScreeningRound ? 'Send confirmation emails now?' : 'Send scheduling emails now?'}
          </DialogTitle>
          <DialogDescription>
            {isScreeningRound 
              ? 'This will send evaluation confirmation instructions to selected startups with their assigned investor details.'
              : 'This will send pitch scheduling instructions to selected startups with their assigned investor calendar links.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-foreground">Email Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round:</span>
                <Badge variant="outline">{roundName}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Startups:</span>
                <Badge variant="secondary">{loading ? '...' : emailStats.totalStartups}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investors:</span>
                <Badge variant="secondary">{loading ? '...' : emailStats.totalJurors}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emails:</span>
                <Badge variant="default">{loading ? '...' : emailStats.estimatedEmails}</Badge>
              </div>
            </div>
            {emailStats.alreadyEmailed > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                {emailStats.alreadyEmailed} startups already received {isScreeningRound ? 'confirmation' : 'scheduling'} emails
              </div>
            )}
          </div>

          {/* Filter Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Filter Options</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="only-confirmed" 
                checked={onlyConfirmed}
                onCheckedChange={(checked) => setOnlyConfirmed(!!checked)}
              />
              <label htmlFor="only-confirmed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Only for confirmed pairs
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-emailed" 
                checked={excludeAlreadyEmailed}
                onCheckedChange={(checked) => setExcludeAlreadyEmailed(!!checked)}
              />
              <label htmlFor="exclude-emailed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Exclude already emailed
              </label>
            </div>
          </div>

          {emailStats.estimatedEmails === 0 && !loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              No emails to send with current filters
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmails} 
            disabled={sending || emailStats.estimatedEmails === 0 || loading}
          >
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {sending ? 'Sending...' : `Send ${emailStats.estimatedEmails} Emails`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};