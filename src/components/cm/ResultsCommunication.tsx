import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mail, 
  CheckCircle, 
  Edit, 
  Send, 
  Users, 
  Building,
  FileText,
  Eye,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { StartupCommunicationConfirmationModal } from './StartupCommunicationConfirmationModal';
import { validateStartupCommunications, type CommunicationValidationResult } from '@/utils/startupCommunicationValidation';

interface StartupResult {
  id: string;
  name: string;
  email: string;
  industry: string;
  averageScore: number;
  isSelected: boolean;
  roundStatus?: string;
  feedbackSummary: string;
  feedbackStatus: 'draft' | 'reviewed' | 'approved' | 'sent';
  communicationSent: boolean;
}

interface CommunicationTemplate {
  id: string;
  type: 'selected' | 'not-selected' | 'under-review' | 'rejected' | 'juror-report';
  subject: string;
  content: string;
}

interface ResultsCommunicationProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const ResultsCommunication = ({ currentRound }: ResultsCommunicationProps) => {
  const [startupResults, setStartupResults] = useState<StartupResult[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<StartupResult | null>(null);
  const [editingFeedback, setEditingFeedback] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingCommunicationType, setPendingCommunicationType] = useState<'selected' | 'rejected' | 'under-review' | null>(null);
  const [validationResult, setValidationResult] = useState<CommunicationValidationResult | null>(null);
  const [validatingEmails, setValidatingEmails] = useState(false);
  

  useEffect(() => {
    fetchResultsData();
    loadTemplates();
  }, [currentRound]);

  const fetchResultsData = async () => {
    try {
      // Determine which evaluation table to use based on current round
      const evaluationTable = currentRound === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
      
      let startupsData;
      
      if (currentRound === 'pitchingRound') {
        console.log('Pitching round: filtering for startups selected in screening round');
        
        // For pitching round, only fetch startups that were selected in screening
        const { data, error } = await supabase
          .from('startups')
          .select(`
            *,
            ${evaluationTable}(
              overall_score,
              status,
              strengths,
              improvement_areas,
              overall_notes
            ),
            startup_round_statuses!inner(
              status,
              rounds!inner(name)
            )
          `)
          .eq('startup_round_statuses.rounds.name', 'screening')
          .eq('startup_round_statuses.status', 'selected');
        
        if (error) throw error;
        startupsData = data;
      } else {
        console.log('Screening round: showing all startups');
        
        // For screening round, fetch all startups
        const { data, error } = await supabase
          .from('startups')
          .select(`
            *,
            ${evaluationTable}(
              overall_score,
              status,
              strengths,
              improvement_areas,
              overall_notes
            )
          `);
        
        if (error) throw error;
        startupsData = data;
      }

      // Get round-specific statuses from startup_round_statuses table
      const { data: roundStatusesData, error: roundStatusError } = await supabase
        .from('startup_round_statuses')
        .select(`
          startup_id,
          status,
          rounds!inner(name)
        `)
        .eq('rounds.name', currentRound === 'screeningRound' ? 'screening' : 'pitching');

      if (roundStatusError) throw roundStatusError;

      // Create a map of startup IDs to their round-specific statuses
      const roundStatusMap = new Map();
      roundStatusesData?.forEach(rs => {
        roundStatusMap.set(rs.startup_id, rs.status);
      });

      console.log(`Loaded ${startupsData?.length || 0} startups for ${currentRound} communication`);
      console.log(`Found ${roundStatusesData?.length || 0} round statuses`);

      const resultsData: StartupResult[] = startupsData?.map(startup => {
        const evaluationKey = currentRound === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
        const evaluations = startup[evaluationKey] || [];
        const submittedEvaluations = evaluations.filter(e => e.status === 'submitted');
        const scores = submittedEvaluations
          .map(e => e.overall_score)
          .filter(score => score !== null) as number[];
        
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;

        // Use round-specific status from startup_round_statuses table
        const roundStatus = roundStatusMap.get(startup.id) || 'pending';

        // Generate AI feedback summary (placeholder - would use actual AI)
        const strengths = submittedEvaluations.flatMap(e => e.strengths || []);
        const improvements = submittedEvaluations.map(e => e.improvement_areas).filter(Boolean);
        const notes = submittedEvaluations.map(e => e.overall_notes).filter(Boolean);

        const feedbackSummary = generateFeedbackSummary(startup.name, strengths, improvements, notes, averageScore);

        return {
          id: startup.id,
          name: startup.name,
          email: startup.contact_email || 'no-email@example.com',
          industry: startup.industry || 'N/A',
          averageScore,
          isSelected: roundStatus === 'selected',
          roundStatus,
          feedbackSummary,
          feedbackStatus: 'draft' as const,
          communicationSent: false
        };
      }) || [];

      setStartupResults(resultsData);
    } catch (error) {
      console.error('Error fetching results data:', error);
      toast.error('Failed to load results data');
    } finally {
      setLoading(false);
    }
  };

  const generateFeedbackSummary = (
    name: string, 
    strengths: string[], 
    improvements: string[], 
    notes: string[], 
    score: number
  ): string => {
    // This would be replaced with actual AI generation
    return `Dear ${name} team,

Thank you for participating in our evaluation process. Here's your feedback summary:

**Key Strengths:**
${strengths.slice(0, 3).map(s => `• ${s}`).join('\n') || '• Strong potential identified by our evaluation panel'}

**Areas for Improvement:**
${improvements.slice(0, 2).map(i => `• ${i}`).join('\n') || '• Continue developing your core value proposition'}

**Overall Assessment:**
Your startup received an average score of ${formatScore(score)}/10 from our evaluation panel. ${score >= 7 ? 'This represents strong performance across key criteria.' : 'There are opportunities to strengthen key areas of your business.'}

${notes.length > 0 ? `**Additional Notes:**\n${notes[0]}` : ''}

Best regards,
The Aurora Evaluation Team`;
  };

  const loadTemplates = () => {
    const defaultTemplates: CommunicationTemplate[] = [
      {
        id: '1',
        type: 'selected',
        subject: currentRound === 'screeningRound' 
          ? '🎉 Congratulations! You\'ve been selected for the Pitching Round'
          : '🎉 Congratulations! You\'ve been selected as a Finalist',
        content: currentRound === 'screeningRound'
          ? `Congratulations! Your startup has been selected to advance to the Pitching Round of our evaluation process.

**Next Steps:**
• You will receive a calendar invite for your pitch session
• Prepare a 10-minute presentation followed by Q&A
• Review the attached pitch guidelines

We look forward to seeing your presentation!

Best regards,
The Aurora Team`
          : `Congratulations! Your startup has been selected as a Finalist in our evaluation process.

**What this means:**
• You are among our top selected startups
• Further partnership opportunities may be available
• You will receive detailed feedback from our evaluation panel

We are excited to continue our relationship with your startup!

Best regards,
The Aurora Team`
      },
      {
        id: '2',
        type: 'under-review',
        subject: 'Your Application Status - Under Review',
        content: `Thank you for participating in our startup evaluation process. Your application is currently under review by our evaluation panel.

**Current Status:**
• Your startup is being evaluated by our expert panel
• We expect to have results within [TIMEFRAME]
• No action is required from your side at this time

We appreciate your patience as we complete our thorough evaluation process.

Best regards,
The Aurora Team`
      },
      {
        id: '3',
        type: 'rejected',
        subject: 'Thank you for your participation',
        content: `Thank you for participating in our startup evaluation process. After careful consideration by our evaluation panel, we have decided not to move forward with your startup at this time.

**Your Feedback:**
[FEEDBACK_SUMMARY]

While we cannot proceed with your startup in this round, we were impressed by your dedication and innovation. We encourage you to:
• Continue developing your business based on the feedback provided
• Consider applying to future programs
• Stay connected with our community

Best regards,
The Aurora Team`
      },
      {
        id: '4',
        type: 'not-selected',
        subject: 'Thank you for participating in our evaluation process',
        content: `Thank you for participating in our startup evaluation process. While your startup was not selected for the next phase, we were impressed by your dedication and innovation.

**Your Feedback:**
[FEEDBACK_SUMMARY]

We encourage you to continue developing your business and consider applying to future programs.

Best regards,
The Aurora Team`
      },
      {
        id: '5',
        type: 'juror-report',
        subject: `${currentRound === 'screeningRound' ? 'Screening' : 'Pitching'} Round Evaluation Results - Summary Report`,
        content: `Thank you for your participation as an evaluator in the ${currentRound === 'screeningRound' ? 'Screening' : 'Pitching'} Round of our startup evaluation process.

         **Summary:**
         • Total startups evaluated: [TOTAL_STARTUPS]
         • Selected startups for ${currentRound === 'screeningRound' ? 'Pitching Round' : 'Final Selection'}
         • Average evaluation score: [AVERAGE_SCORE]

Please find the detailed results and your contribution report attached.

Best regards,
The Aurora Team`
      }
    ];
    setTemplates(defaultTemplates);
  };


  const handleEditFeedback = (result: StartupResult) => {
    setSelectedResult(result);
    setEditingFeedback(result.feedbackSummary);
    setShowFeedbackDialog(true);
  };

  const handleSaveFeedback = async () => {
    if (!selectedResult) return;

    // Update the feedback in state (in a real app, you'd save to database)
    setStartupResults(prev => prev.map(result =>
      result.id === selectedResult.id
        ? { ...result, feedbackSummary: editingFeedback, feedbackStatus: 'reviewed' }
        : result
    ));

    setShowFeedbackDialog(false);
    toast.success('Feedback updated successfully');
  };

  const handleApproveFeedback = async (resultId: string) => {
    setStartupResults(prev => prev.map(result =>
      result.id === resultId
        ? { ...result, feedbackStatus: 'approved' }
        : result
    ));
    toast.success('Feedback approved');
  };

  // Enhanced communication sending with validation
  const initiateCommunications = async (type: 'selected' | 'rejected' | 'under-review') => {
    setValidatingEmails(true);
    try {
      // Filter startups based on type
      let targetResults = startupResults;
      
      if (type === 'selected') {
        targetResults = startupResults.filter(r => r.roundStatus === 'selected');
      } else if (type === 'rejected') {
        targetResults = startupResults.filter(r => r.roundStatus === 'rejected');
      } else if (type === 'under-review') {
        targetResults = startupResults.filter(r => r.roundStatus === 'under-review' || r.roundStatus === 'pending');
      }

      // Run validation
      const validation = await validateStartupCommunications(targetResults, type, currentRound);
      
      setValidationResult(validation);
      setPendingCommunicationType(type);
      setShowSendDialog(false);
      setShowConfirmationModal(true);
      
    } catch (error) {
      console.error('Error validating communications:', error);
      toast.error('Failed to validate communications');
    } finally {
      setValidatingEmails(false);
    }
  };

  const sendCommunications = async () => {
    if (!validationResult || !pendingCommunicationType) return;
    
    setSendingEmails(true);
    try {
      // Only send to validated startups
      const validStartups = validationResult.validationResults.filter(r => r.isValid);
      
      let successCount = 0;
      for (const validatedStartup of validStartups) {
        // Find the original startup data
        const startup = startupResults.find(s => s.id === validatedStartup.id);
        if (!startup) continue;
        
        try {
          const { data, error } = await supabase.functions.invoke('send-individual-result', {
            body: {
              startupId: startup.id,
              startupName: startup.name,
              recipientEmail: startup.email,
              communicationType: pendingCommunicationType,
              roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
              feedbackSummary: startup.feedbackSummary
            }
          });

          if (error) {
            console.error(`Failed to send email to ${startup.name}:`, error);
            toast.error(`Failed to send email to ${startup.name}`);
            continue;
          }

          console.log(`Email sent successfully to ${startup.name}:`, data);
          successCount++;
          
          // Update status
          setStartupResults(prev => prev.map(r =>
            r.id === startup.id
              ? { ...r, feedbackStatus: 'sent', communicationSent: true }
              : r
          ));
        } catch (emailError) {
          console.error(`Error sending email to ${startup.name}:`, emailError);
          toast.error(`Error sending email to ${startup.name}`);
        }
      }

      const skippedCount = validationResult.validationSummary.willSkip;
      
      if (successCount > 0) {
        toast.success(
          `Successfully sent ${successCount} emails` + 
          (skippedCount > 0 ? `. ${skippedCount} startups were skipped due to validation issues.` : '')
        );
      }
      
      // Reset states
      setShowConfirmationModal(false);
      setPendingCommunicationType(null);
      setValidationResult(null);
      
    } catch (error) {
      console.error('Error sending communications:', error);
      toast.error('Failed to send communications');
    } finally {
      setSendingEmails(false);
    }
  };

  // Enhanced function for individual email sending with better error handling
  const sendIndividualEmail = async (result: StartupResult, communicationType: 'selected' | 'rejected' | 'under-review') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-individual-result', {
        body: {
          startupId: result.id,
          startupName: result.name,
          recipientEmail: result.email,
          communicationType,
          roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
          feedbackSummary: result.feedbackSummary
        }
      });

      if (error) {
        console.error(`Failed to invoke send-individual-result function for ${result.name}:`, error);
        toast.error(`Failed to send email to ${result.name}: ${error.message || 'Function invocation failed'}`);
        return false;
      }

      // Check if the function returned an error in the data
      if (data?.error) {
        console.error(`Edge function returned error for ${result.name}:`, data.error);
        toast.error(`Failed to send email to ${result.name}: ${data.error}`);
        return false;
      }

      // Check if the function was successful
      if (!data?.success) {
        console.error(`Edge function did not indicate success for ${result.name}:`, data);
        toast.error(`Failed to send email to ${result.name}: ${data?.message || 'Unknown error'}`);
        return false;
      }

      console.log(`Individual email sent successfully to ${result.name}:`, data);
      
      // Update status in local state
      setStartupResults(prev => prev.map(r =>
        r.id === result.id
          ? { ...r, feedbackStatus: 'sent', communicationSent: true }
          : r
      ));
      
      
      toast.success(`${communicationType.charAt(0).toUpperCase() + communicationType.slice(1)} email sent to ${result.name}`);
      return true;
    } catch (error) {
      console.error(`Error sending individual email to ${result.name}:`, error);
      toast.error(`Error sending email to ${result.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // New function to handle round transition workflow
  const initiateRoundTransition = async () => {
    try {
      // Notify all jurors about screening completion
      const { data: jurors, error: jurorError } = await supabase
        .from('jurors')
        .select('*')
        .not('user_id', 'is', null);

      if (jurorError) {
        console.error('Error fetching jurors for transition:', jurorError);
        return;
      }

      // Get evaluation count per juror
      const jurorNotifications = await Promise.allSettled(
        jurors.map(async (juror) => {
          const { count } = await supabase
            .from('screening_evaluations')
            .select('*', { count: 'exact', head: true })
            .eq('evaluator_id', juror.user_id)
            .eq('status', 'submitted');

          return supabase.functions.invoke('send-juror-phase-transition', {
            body: {
              jurorId: juror.id,
              name: juror.name,
              email: juror.email,
              fromRound: 'screening',
              toRound: 'pitching',
              evaluationCount: count || 0
            }
          });
        })
      );

      const successfulNotifications = jurorNotifications.filter(result => result.status === 'fulfilled').length;
      toast.success(`Sent transition notifications to ${successfulNotifications} jurors`);

       // Show transition success message
       toast.success(
          "Screening round completed! You can now switch to Pitching round to assign jurors to the selected startups.",
          { duration: 10000 }
        );

    } catch (error) {
      console.error('Error in round transition:', error);
      toast.error('Round transition notifications failed');
    }
  };

  const getFeedbackStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'reviewed':
        return <Badge className="bg-primary text-primary-foreground">Reviewed</Badge>;
      case 'sent':
        return <Badge className="bg-accent text-accent-foreground">Sent</Badge>;
      case 'draft':
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedStartups = startupResults.filter(r => r.roundStatus === 'selected');
  const notSelectedStartups = startupResults.filter(r => r.roundStatus === 'rejected');
  const underReviewStartups = startupResults.filter(r => r.roundStatus === 'under-review' || r.roundStatus === 'pending');
  const approvedFeedback = startupResults.filter(r => r.feedbackStatus === 'approved');
  const sentCommunications = startupResults.filter(r => r.communicationSent);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Results Communication - {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
              </CardTitle>
            </div>
            <CardDescription>
              Review feedback summaries and send {currentRound === 'screeningRound' ? 'evaluation' : 'pitch'} results to startups and jurors
            </CardDescription>
          </div>
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button>
                <Send className="w-4 h-4 mr-2" />
                Send Communications
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send Communications</DialogTitle>
                <DialogDescription>
                  Choose which group to send communications to
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => initiateCommunications('selected')}
                  disabled={sendingEmails || validatingEmails}
                >
                  {validatingEmails ? 'Validating...' : `Send to Selected Startups (${selectedStartups.length})`}
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => initiateCommunications('rejected')}
                  disabled={sendingEmails || validatingEmails}
                >
                  {validatingEmails ? 'Validating...' : `Send to Rejected Startups (${notSelectedStartups.length})`}
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => initiateCommunications('under-review')}
                  disabled={sendingEmails || validatingEmails}
                >
                  {validatingEmails ? 'Validating...' : `Send to Under Review Startups (${underReviewStartups.length})`}
                </Button>
                
                {currentRound === 'screeningRound' && (
                  <div className="pt-4 mt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-2">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Sending results will notify jurors that screening is complete and initiate the transition to Pitching round.
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
        <CardContent>
          {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{selectedStartups.length}</div>
            <div className="text-sm text-muted-foreground">Selected</div>
          </div>
          <div className="text-center p-4 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{notSelectedStartups.length}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{underReviewStartups.length}</div>
            <div className="text-sm text-muted-foreground">Under Review</div>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{approvedFeedback.length}</div>
            <div className="text-sm text-muted-foreground">Approved Feedback</div>
          </div>
          <div className="text-center p-4 bg-accent/10 rounded-lg">
            <div className="text-2xl font-bold text-accent">{sentCommunications.length}</div>
            <div className="text-sm text-muted-foreground">Sent</div>
          </div>
        </div>

        <Tabs defaultValue="feedback" className="space-y-6">
          <TabsList>
            <TabsTrigger value="feedback">Feedback Review</TabsTrigger>
            <TabsTrigger value="selected">Selected ({selectedStartups.length})</TabsTrigger>
            <TabsTrigger value="under-review">Under Review ({underReviewStartups.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({notSelectedStartups.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-4">
            {startupResults.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{result.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {result.industry} • Score: {formatScore(result.averageScore)}
                      </p>
                    </div>
                    {result.roundStatus === 'selected' && <Badge className="bg-success text-success-foreground">Selected</Badge>}
                    {result.roundStatus === 'rejected' && <Badge className="bg-destructive text-destructive-foreground">Rejected</Badge>}
                    {result.roundStatus === 'under-review' && <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>}
                    {result.roundStatus === 'pending' && <Badge variant="secondary">Pending</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {getFeedbackStatusBadge(result.feedbackStatus)}
                    <Button size="sm" variant="outline" onClick={() => handleEditFeedback(result)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {result.feedbackStatus === 'reviewed' && (
                      <Button size="sm" onClick={() => handleApproveFeedback(result.id)}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-sm">
                  <div className="line-clamp-3">{result.feedbackSummary}</div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="selected" className="space-y-4">
            {selectedStartups.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{result.name}</h4>
                    <p className="text-sm text-muted-foreground">
                       {result.email} • Score: {formatScore(result.averageScore)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.communicationSent ? (
                      <Badge className="bg-accent text-accent-foreground">Email Sent</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="under-review" className="space-y-4">
            {underReviewStartups.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{result.name}</h4>
                    <p className="text-sm text-muted-foreground">
                       {result.email} • Score: {formatScore(result.averageScore)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.communicationSent ? (
                      <Badge className="bg-accent text-accent-foreground">Email Sent</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {notSelectedStartups.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{result.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {result.email} • Score: {formatScore(result.averageScore)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.communicationSent ? (
                      <Badge className="bg-accent text-accent-foreground">Email Sent</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            {templates.map(template => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-base">{template.subject}</CardTitle>
                  <CardDescription>
                    Template for {template.type.replace('-', ' ')} communications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded text-sm whitespace-pre-line">
                    {template.content}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Feedback Edit Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Feedback Summary</DialogTitle>
              <DialogDescription>
                Review and edit the AI-generated feedback for {selectedResult?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editingFeedback}
                onChange={(e) => setEditingFeedback(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFeedback}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Confirmation Modal */}
        <StartupCommunicationConfirmationModal
          open={showConfirmationModal}
          onOpenChange={setShowConfirmationModal}
          communicationType={pendingCommunicationType}
          currentRound={currentRound}
          validationResults={validationResult?.validationResults || []}
          validationSummary={validationResult?.validationSummary || {
            totalStartups: 0,
            validStartups: 0,
            willSend: 0,
            willSkip: 0,
            skipReasons: {}
          }}
          onConfirm={sendCommunications}
          isLoading={sendingEmails}
        />
      </CardContent>
    </Card>
  );
};