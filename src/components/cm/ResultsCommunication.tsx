import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface StartupResult {
  id: string;
  name: string;
  email: string;
  industry: string;
  averageScore: number;
  isSelected: boolean;
  feedbackSummary: string;
  feedbackStatus: 'draft' | 'reviewed' | 'approved' | 'sent';
  communicationSent: boolean;
}

interface CommunicationTemplate {
  id: string;
  type: 'selected' | 'not-selected' | 'juror-report';
  subject: string;
  content: string;
}

interface ResultsCommunicationProps {
  currentPhase: 'phase1' | 'phase2';
}

export const ResultsCommunication = ({ currentPhase }: ResultsCommunicationProps) => {
  const [startupResults, setStartupResults] = useState<StartupResult[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<StartupResult | null>(null);
  const [editingFeedback, setEditingFeedback] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);

  useEffect(() => {
    fetchResultsData();
    loadTemplates();
  }, []);

  const fetchResultsData = async () => {
    try {
      // Fetch startups with their evaluation results
      const { data: startupsData, error } = await supabase
        .from('startups')
        .select(`
          *,
          startup_assignments(
            evaluations(
              overall_score,
              status,
              strengths,
              improvement_areas,
              overall_notes
            )
          )
        `);

      if (error) throw error;

      const resultsData: StartupResult[] = startupsData?.map(startup => {
        const evaluations = startup.startup_assignments?.flatMap(a => a.evaluations || []) || [];
        const submittedEvaluations = evaluations.filter(e => e.status === 'submitted');
        const scores = submittedEvaluations
          .map(e => e.overall_score)
          .filter(score => score !== null) as number[];
        
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;

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
          isSelected: startup.status === 'shortlisted',
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
Your startup received an average score of ${score.toFixed(1)}/10 from our evaluation panel. ${score >= 7 ? 'This represents strong performance across key criteria.' : 'There are opportunities to strengthen key areas of your business.'}

${notes.length > 0 ? `**Additional Notes:**\n${notes[0]}` : ''}

Best regards,
The Aurora Evaluation Team`;
  };

  const loadTemplates = () => {
    const defaultTemplates: CommunicationTemplate[] = [
      {
        id: '1',
        type: 'selected',
        subject: '🎉 Congratulations! You\'ve been selected for Phase 2',
        content: `Congratulations! Your startup has been selected to advance to Phase 2 of our evaluation process.

**Next Steps:**
• You will receive a calendar invite for your pitch session
• Prepare a 10-minute presentation followed by Q&A
• Review the attached pitch guidelines

We look forward to seeing your presentation!

Best regards,
The Aurora Team`
      },
      {
        id: '2',
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
        id: '3',
        type: 'juror-report',
        subject: 'Phase 1 Evaluation Results - Summary Report',
        content: `Thank you for your participation as an evaluator in Phase 1 of our startup evaluation process.

**Summary:**
• Total startups evaluated: [TOTAL_STARTUPS]
• Top 30 selected for Phase 2
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

  const sendCommunications = async (type: 'selected' | 'not-selected' | 'all') => {
    setSendingEmails(true);
    try {
      let targetResults = startupResults;
      
      if (type === 'selected') {
        targetResults = startupResults.filter(r => r.isSelected);
      } else if (type === 'not-selected') {
        targetResults = startupResults.filter(r => !r.isSelected);
      }

      // In a real implementation, this would call the email service
      for (const result of targetResults) {
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update status
        setStartupResults(prev => prev.map(r =>
          r.id === result.id
            ? { ...r, feedbackStatus: 'sent', communicationSent: true }
            : r
        ));
      }

      toast.success(`Successfully sent ${targetResults.length} emails`);
      setShowSendDialog(false);
    } catch (error) {
      console.error('Error sending communications:', error);
      toast.error('Failed to send communications');
    } finally {
      setSendingEmails(false);
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

  const selectedStartups = startupResults.filter(r => r.isSelected);
  const notSelectedStartups = startupResults.filter(r => !r.isSelected);
  const approvedFeedback = startupResults.filter(r => r.feedbackStatus === 'approved');
  const sentCommunications = startupResults.filter(r => r.communicationSent);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Results Communication - {currentPhase === 'phase1' ? 'Phase 1' : 'Phase 2'}
            </CardTitle>
            <CardDescription>
              Review feedback summaries and send {currentPhase === 'phase1' ? 'evaluation' : 'pitch'} results to startups and jurors
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
                  onClick={() => sendCommunications('selected')}
                  disabled={sendingEmails}
                >
                  Send to Selected Startups ({selectedStartups.length})
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => sendCommunications('not-selected')}
                  disabled={sendingEmails}
                >
                  Send to Non-Selected Startups ({notSelectedStartups.length})
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => sendCommunications('all')}
                  disabled={sendingEmails}
                >
                  Send to All Startups ({startupResults.length})
                </Button>
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{selectedStartups.length}</div>
            <div className="text-sm text-muted-foreground">Selected</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{notSelectedStartups.length}</div>
            <div className="text-sm text-muted-foreground">Not Selected</div>
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
            <TabsTrigger value="not-selected">Not Selected ({notSelectedStartups.length})</TabsTrigger>
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
                        {result.industry} • Score: {result.averageScore.toFixed(1)}
                      </p>
                    </div>
                    {result.isSelected && <Badge className="bg-success text-success-foreground">Selected</Badge>}
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
                      {result.email} • Score: {result.averageScore.toFixed(1)}
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

          <TabsContent value="not-selected" className="space-y-4">
            {notSelectedStartups.map(result => (
              <div key={result.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{result.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {result.email} • Score: {result.averageScore.toFixed(1)}
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
      </CardContent>
    </Card>
  );
};