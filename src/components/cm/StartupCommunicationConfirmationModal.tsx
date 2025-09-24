import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, AlertTriangle, CheckCircle, XCircle, Eye, Building, User } from "lucide-react";

interface StartupValidationResult {
  id: string;
  name: string;
  email: string;
  industry: string;
  roundStatus: string;
  isValid: boolean;
  skipReasons: string[];
  communicationType: 'selected' | 'rejected' | 'under-review';
}

interface ValidationSummary {
  totalStartups: number;
  validStartups: number;
  willSend: number;
  willSkip: number;
  skipReasons: Record<string, number>;
}

interface StartupCommunicationConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communicationType: 'selected' | 'rejected' | 'under-review' | null;
  currentRound: 'screeningRound' | 'pitchingRound';
  validationResults: StartupValidationResult[];
  validationSummary: ValidationSummary;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const StartupCommunicationConfirmationModal = ({
  open,
  onOpenChange,
  communicationType,
  currentRound,
  validationResults,
  validationSummary,
  onConfirm,
  isLoading = false
}: StartupCommunicationConfirmationModalProps) => {
  const [loading, setLoading] = useState(false);
  
  const roundName = currentRound === 'screeningRound' ? 'Screening' : 'Pitching';
  const commTypeLabel = communicationType?.charAt(0).toUpperCase() + communicationType?.slice(1).replace('-', ' ') || '';

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

  const validStartups = validationResults.filter(s => s.isValid);
  const invalidStartups = validationResults.filter(s => !s.isValid);

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
            Send {commTypeLabel} Communications - {roundName} Round
          </DialogTitle>
          <DialogDescription>
            Review validation results before sending emails to startups
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{validationSummary.totalStartups}</div>
              <div className="text-xs text-muted-foreground">Total Startups</div>
            </div>
            <div className="bg-success/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-success">{validationSummary.willSend}</div>
              <div className="text-xs text-muted-foreground">Will Send</div>
            </div>
            <div className="bg-destructive/10 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-destructive">{validationSummary.willSkip}</div>
              <div className="text-xs text-muted-foreground">Will Skip</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-600">
                {Math.round((validationSummary.willSend / validationSummary.totalStartups) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>

          {/* Warnings */}
          {validationSummary.willSkip > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Validation Issues Found</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    {validationSummary.willSkip} startups will be skipped due to validation issues:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(validationSummary.skipReasons).map(([reason, count]) => (
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

          {/* Validation Results Tabs */}
          <Tabs defaultValue="will-send" className="space-y-4">
            <TabsList>
              <TabsTrigger value="will-send" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Will Send ({validationSummary.willSend})
              </TabsTrigger>
              <TabsTrigger value="will-skip" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Will Skip ({validationSummary.willSkip})
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="will-send">
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {validStartups.map(startup => (
                    <div key={startup.id} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <div>
                          <div className="font-medium text-sm">{startup.name}</div>
                          <div className="text-xs text-muted-foreground">{startup.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {startup.industry}
                        </Badge>
                        <Badge 
                          variant={startup.roundStatus === 'selected' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {startup.roundStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {validStartups.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No valid startups found for this communication type
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="will-skip">
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {invalidStartups.map(startup => (
                    <div key={startup.id} className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <div>
                          <div className="font-medium text-sm">{startup.name}</div>
                          <div className="text-xs text-muted-foreground">{startup.email || 'No email'}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {startup.skipReasons.map((reason, index) => (
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
                  {invalidStartups.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      All startups passed validation!
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="preview">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Email Preview
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs text-muted-foreground">Subject Line:</label>
                    <div className="font-medium">
                      {communicationType === 'selected' && currentRound === 'screeningRound' && 
                        '🎉 Congratulations! You\'ve been selected for the Pitching Round'}
                      {communicationType === 'selected' && currentRound === 'pitchingRound' && 
                        '🎉 Congratulations! You\'ve been selected as a Finalist'}
                      {communicationType === 'rejected' && 
                        'Thank you for your participation'}
                      {communicationType === 'under-review' && 
                        'Your Application Status - Under Review'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">From:</label>
                    <div>Aurora Tech Awards &lt;noreply@resend.dev&gt;</div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Communication Type:</label>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={communicationType === 'selected' ? 'default' : 
                                communicationType === 'rejected' ? 'destructive' : 'secondary'}
                      >
                        {commTypeLabel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">for {roundName} Round</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Includes:</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">Personalized feedback</Badge>
                      <Badge variant="outline" className="text-xs">Round-specific content</Badge>
                      <Badge variant="outline" className="text-xs">Next steps guidance</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Confirmation */}
          <div className="text-center py-4 border-t">
            <p className="text-foreground font-medium mb-2">
              Send {commTypeLabel.toLowerCase()} emails to {validationSummary.willSend} startups?
            </p>
            <p className="text-sm text-muted-foreground">
              Each startup will receive a personalized email with their evaluation results and next steps.
              {validationSummary.willSkip > 0 && ` ${validationSummary.willSkip} startups will be skipped due to validation issues.`}
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
          <Button 
            onClick={handleConfirm}
            disabled={loading || isLoading || validationSummary.willSend === 0}
            className="min-w-32"
          >
            {loading || isLoading
              ? 'Sending...' 
              : `Send ${validationSummary.willSend} Emails`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};