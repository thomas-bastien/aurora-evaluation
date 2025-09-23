import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, User, Clock, AlertTriangle } from "lucide-react";

interface JurorProgress {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  assignedCount: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
  lastReminderSent?: Date;
  canSendReminder?: boolean;
}

interface JurorReminderConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'individual' | 'bulk' | null;
  selectedJuror?: JurorProgress | null;
  eligibleJurors?: JurorProgress[];
  currentRound: 'screeningRound' | 'pitchingRound';
  onConfirm: () => Promise<void>;
}

export const JurorReminderConfirmationModal = ({
  open,
  onOpenChange,
  type,
  selectedJuror,
  eligibleJurors,
  currentRound,
  onConfirm
}: JurorReminderConfirmationModalProps) => {
  const [loading, setLoading] = useState(false);
  
  const roundName = currentRound === 'screeningRound' ? 'Screening' : 'Pitching';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const formatLastReminder = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {type === 'individual' ? 'Send Reminder' : 'Send Bulk Reminders'}
          </DialogTitle>
          <DialogDescription>
            {type === 'individual' 
              ? 'Send an evaluation reminder to this juror'
              : 'Send evaluation reminders to all incomplete jurors'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning for bulk reminders */}
          {type === 'bulk' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Bulk Reminder Action</h4>
                  <p className="text-sm text-amber-700">
                    This will send reminder emails to all eligible jurors. Make sure this is intentional as it affects multiple people.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Individual Juror Details */}
          {type === 'individual' && selectedJuror && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Juror Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <div className="font-medium">{selectedJuror.name}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <div>{selectedJuror.email}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Company</label>
                  <div>{selectedJuror.company}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Role</label>
                  <div>{selectedJuror.job_title}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Completion Rate</label>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedJuror.completionRate >= 100 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {Math.round(selectedJuror.completionRate)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({selectedJuror.completedCount} of {selectedJuror.assignedCount})
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Pending Evaluations</label>
                  <div className="font-medium">{selectedJuror.pendingCount}</div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last Reminder Sent
                  </label>
                  <div className="text-sm">
                    {formatLastReminder(selectedJuror.lastReminderSent)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Reminder Summary */}
          {type === 'bulk' && eligibleJurors && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Reminder Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{eligibleJurors.length}</div>
                  <div className="text-xs text-muted-foreground">Eligible Jurors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {eligibleJurors.reduce((sum, j) => sum + j.pendingCount, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {Math.round(eligibleJurors.reduce((sum, j) => sum + j.completionRate, 0) / eligibleJurors.length)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg. Completion</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-muted">
                <div className="text-xs text-muted-foreground mb-2">Eligibility Criteria:</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Completion rate &lt; 100%</Badge>
                  <Badge variant="outline" className="text-xs">No reminder in last 7 days</Badge>
                  <Badge variant="outline" className="text-xs">{roundName} Round</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Message */}
          <div className="text-center py-4">
            <p className="text-foreground font-medium">
              {type === 'individual' && selectedJuror
                ? `Send a ${roundName} evaluation reminder to ${selectedJuror.name}?`
                : `Send ${roundName} evaluation reminders to ${eligibleJurors?.length || 0} incomplete jurors?`
              }
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {type === 'individual' 
                ? 'The juror will receive an email with their current progress and a link to complete evaluations.'
                : 'Each eligible juror will receive a personalized email with their progress and evaluation link.'
              }
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={loading}
            className="min-w-24"
          >
            {loading 
              ? 'Sending...' 
              : type === 'individual' 
                ? 'Send Reminder' 
                : 'Send All Reminders'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};