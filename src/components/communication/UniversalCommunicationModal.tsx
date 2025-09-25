import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, User, Building, Clock, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";

// Base participant interface
interface BaseParticipant {
  id: string;
  name: string;
  email: string;
}

// Extended interfaces for different participant types
interface JurorParticipant extends BaseParticipant {
  company: string;
  job_title: string;
  assignedCount?: number;
  completedCount?: number;
  pendingCount?: number;
  completionRate?: number;
  lastReminderSent?: Date;
  canSendReminder?: boolean;
}

interface StartupParticipant extends BaseParticipant {
  industry: string;
  status?: string;
  isValid?: boolean;
  skipReasons?: string[];
  communicationType?: string;
}

// Communication types
type CommunicationType = 
  | 'reminder' 
  | 'assignment-notification' 
  | 'scheduling-email' 
  | 'results-selected' 
  | 'results-rejected' 
  | 'results-under-review';

// Modal props
interface UniversalCommunicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Communication details
  communicationType: CommunicationType;
  currentRound: 'screeningRound' | 'pitchingRound';
  
  // Mode and participant data
  type: 'individual' | 'bulk';
  selectedParticipant?: JurorParticipant | StartupParticipant | null;
  participants?: (JurorParticipant | StartupParticipant)[];
  
  // Statistics
  statistics: {
    total: number;
    eligible: number;
    willSend: number;
    willSkip: number;
    skipReasons?: Record<string, number>;
  };
  
  // Validation data (for startup communications)
  validationResults?: {
    valid: StartupParticipant[];
    invalid: StartupParticipant[];
  };
  
  // Warnings
  hasThrottleOverride?: boolean;
  throttleMessage?: string;
  
  // Actions
  onConfirm: (forceOverride?: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const UniversalCommunicationModal = ({
  open,
  onOpenChange,
  communicationType,
  currentRound,
  type,
  selectedParticipant,
  participants,
  statistics,
  validationResults,
  hasThrottleOverride = false,
  throttleMessage,
  onConfirm,
  isLoading = false
}: UniversalCommunicationModalProps) => {
  const [loading, setLoading] = useState(false);
  
  const roundName = currentRound === 'screeningRound' ? 'Screening' : 'Pitching';
  
  // Get communication type labels and content
  const getCommTypeLabels = () => {
    switch (communicationType) {
      case 'reminder':
        return {
          title: type === 'individual' ? 'Send Reminder' : 'Send Bulk Reminders',
          description: type === 'individual' 
            ? 'Send an evaluation reminder to this juror'
            : 'Send evaluation reminders to all incomplete jurors',
          action: type === 'individual' ? 'Send Reminder' : 'Send All Reminders',
          participantType: 'juror'
        };
      case 'assignment-notification':
        return {
          title: 'Send Assignment Notifications',
          description: 'Send assignment notification emails to jurors informing them about their assigned startups',
          action: `Send ${statistics.willSend} Notifications`,
          participantType: 'juror'
        };
      case 'scheduling-email':
        return {
          title: currentRound === 'screeningRound' ? 'Send Confirmation Emails' : 'Send Scheduling Emails',
          description: currentRound === 'screeningRound' 
            ? 'Send evaluation confirmation instructions to selected startups with their assigned investor details'
            : 'Send pitch scheduling instructions to selected startups with their assigned investor calendar links',
          action: `Send ${statistics.willSend} Emails`,
          participantType: 'startup'
        };
      case 'results-selected':
      case 'results-rejected':
      case 'results-under-review':
        const resultType = communicationType.split('-')[1];
        return {
          title: `Send ${resultType.charAt(0).toUpperCase() + resultType.slice(1)} Communications`,
          description: 'Review validation results before sending emails to startups',
          action: `Send ${statistics.willSend} Emails`,
          participantType: 'startup'
        };
      default:
        return {
          title: 'Send Communications',
          description: 'Send communications to participants',
          action: 'Send',
          participantType: 'participant'
        };
    }
  };

  const labels = getCommTypeLabels();

  const handleConfirm = async (forceOverride = false) => {
    setLoading(true);
    try {
      await onConfirm(forceOverride);
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

  const getSkipReasonColor = (reason: string) => {
    if (reason.includes('invalid email') || reason.includes('no email')) return 'destructive';
    if (reason.includes('not in round') || reason.includes('wrong status')) return 'secondary';
    if (reason.includes('duplicate') || reason.includes('already sent')) return 'outline';
    return 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {labels.title} - {roundName} Round
          </DialogTitle>
          <DialogDescription>
            {labels.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{statistics.total}</div>
              <div className="text-xs text-muted-foreground">
                Total {labels.participantType === 'juror' ? 'Jurors' : 'Startups'}
              </div>
            </div>
            <div className="bg-success/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-success">{statistics.willSend}</div>
              <div className="text-xs text-muted-foreground">Will Send</div>
            </div>
            <div className="bg-destructive/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-destructive">{statistics.willSkip}</div>
              <div className="text-xs text-muted-foreground">Will Skip</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-600">
                {statistics.total > 0 ? Math.round((statistics.willSend / statistics.total) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>

          {/* Throttle Override Warning */}
          {hasThrottleOverride && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Override Throttle Window</h4>
                  <p className="text-sm text-amber-700">
                    {throttleMessage || 'Some participants have received communications within the throttle window.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Warning */}
          {type === 'bulk' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Bulk Communication Action</h4>
                  <p className="text-sm text-amber-700">
                    This will send communications to multiple participants. Make sure this is intentional.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation Issues Warning */}
          {statistics.willSkip > 0 && statistics.skipReasons && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Validation Issues Found</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    {statistics.willSkip} participants will be skipped due to validation issues:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statistics.skipReasons).map(([reason, count]) => (
                      <Badge 
                        key={reason} 
                        variant={getSkipReasonColor(reason)}
                        className="text-xs"
                      >
                        {reason}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Individual Participant Details */}
          {type === 'individual' && selectedParticipant && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                {labels.participantType === 'juror' ? <User className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                {labels.participantType === 'juror' ? 'Juror Details' : 'Startup Details'}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <div className="font-medium">{selectedParticipant.name}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <div>{selectedParticipant.email}</div>
                </div>
                
                {/* Juror-specific fields */}
                {'company' in selectedParticipant && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Company</label>
                      <div>{selectedParticipant.company}</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Role</label>
                      <div>{selectedParticipant.job_title}</div>
                    </div>
                    {selectedParticipant.completionRate !== undefined && (
                      <div>
                        <label className="text-xs text-muted-foreground">Completion Rate</label>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={selectedParticipant.completionRate >= 100 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {Math.round(selectedParticipant.completionRate)}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({selectedParticipant.completedCount} of {selectedParticipant.assignedCount})
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedParticipant.pendingCount !== undefined && (
                      <div>
                        <label className="text-xs text-muted-foreground">Pending Evaluations</label>
                        <div className="font-medium">{selectedParticipant.pendingCount}</div>
                      </div>
                    )}
                    {selectedParticipant.lastReminderSent !== undefined && (
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last Reminder Sent
                        </label>
                        <div className="text-sm">
                          {formatLastReminder(selectedParticipant.lastReminderSent)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Startup-specific fields */}
                {'industry' in selectedParticipant && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Industry</label>
                      <div>{selectedParticipant.industry}</div>
                    </div>
                    {selectedParticipant.status && (
                      <div>
                        <label className="text-xs text-muted-foreground">Status</label>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {selectedParticipant.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bulk Summary or Validation Results */}
          {type === 'bulk' && (
            <>
              {/* Bulk Summary for non-validation modals */}
              {!validationResults && participants && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Communication Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{participants.length}</div>
                      <div className="text-xs text-muted-foreground">
                        Eligible {labels.participantType === 'juror' ? 'Jurors' : 'Participants'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {communicationType === 'reminder' && participants.length > 0
                          ? (participants as JurorParticipant[]).reduce((sum, j) => sum + (j.pendingCount || 0), 0)
                          : statistics.willSend
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {communicationType === 'reminder' ? 'Total Pending' : 'Will Send'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {communicationType === 'reminder' && participants.length > 0
                          ? Math.round((participants as JurorParticipant[]).reduce((sum, j) => sum + (j.completionRate || 0), 0) / participants.length)
                          : Math.round((statistics.willSend / statistics.total) * 100)
                        }%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {communicationType === 'reminder' ? 'Avg. Completion' : 'Success Rate'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-muted">
                    <div className="text-xs text-muted-foreground mb-2">Communication Details:</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">{roundName} Round</Badge>
                      <Badge variant="outline" className="text-xs">{labels.title}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Results Tabs */}
              {validationResults && (
                <Tabs defaultValue="will-send" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="will-send" className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Will Send ({validationResults.valid.length})
                    </TabsTrigger>
                    <TabsTrigger value="will-skip" className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Will Skip ({validationResults.invalid.length})
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="will-send">
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {validationResults.valid.map(participant => (
                          <div key={participant.id} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-success" />
                              <div>
                                <div className="font-medium text-sm">{participant.name}</div>
                                <div className="text-xs text-muted-foreground">{participant.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {'industry' in participant && (
                                <Badge variant="outline" className="text-xs">
                                  {participant.industry}
                                </Badge>
                              )}
                              {'status' in participant && participant.status && (
                                <Badge 
                                  variant={participant.status === 'selected' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {participant.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        {validationResults.valid.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No valid participants found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="will-skip">
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {validationResults.invalid.map(participant => (
                          <div key={participant.id} className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                            <div className="flex items-center gap-3">
                              <XCircle className="w-4 h-4 text-destructive" />
                              <div>
                                <div className="font-medium text-sm">{participant.name}</div>
                                <div className="text-xs text-muted-foreground">{participant.email || 'No email'}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {participant.skipReasons?.map((reason, index) => (
                                <Badge 
                                  key={index}
                                  variant={getSkipReasonColor(reason)}
                                  className="text-xs"
                                >
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                        {validationResults.invalid.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            All participants passed validation!
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="preview">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Communication Preview
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <label className="text-xs text-muted-foreground">Type:</label>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">
                              {labels.title}
                            </Badge>
                            <span className="text-xs text-muted-foreground">for {roundName} Round</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Recipients:</label>
                          <div>{labels.participantType === 'juror' ? 'Jurors' : 'Startups'}</div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Includes:</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">Personalized content</Badge>
                            <Badge variant="outline" className="text-xs">Round-specific information</Badge>
                            <Badge variant="outline" className="text-xs">Next steps guidance</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}

          {/* Confirmation Message */}
          <div className="text-center py-4 border-t">
            <p className="text-foreground font-medium mb-2">
              {type === 'individual' && selectedParticipant
                ? `Send ${labels.title.toLowerCase()} to ${selectedParticipant.name}?`
                : `Send communications to ${statistics.willSend} ${labels.participantType === 'juror' ? 'jurors' : 'startups'}?`
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {type === 'individual' 
                ? 'The participant will receive a personalized communication with relevant information.'
                : 'Each eligible participant will receive a personalized communication.'
              }
              {statistics.willSkip > 0 && ` ${statistics.willSkip} participants will be skipped due to validation issues.`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading || isLoading}
          >
            Cancel
          </Button>
          {hasThrottleOverride ? (
            <Button 
              onClick={() => handleConfirm(true)}
              disabled={loading || isLoading}
              className="min-w-24 bg-amber-600 hover:bg-amber-700"
            >
              {loading || isLoading
                ? 'Sending...' 
                : type === 'individual' 
                  ? 'Override & Send' 
                  : 'Override & Send All'
              }
            </Button>
          ) : (
            <Button 
              onClick={() => handleConfirm(false)}
              disabled={loading || isLoading || statistics.willSend === 0}
              className="min-w-24"
            >
              {loading || isLoading
                ? 'Sending...' 
                : labels.action
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};