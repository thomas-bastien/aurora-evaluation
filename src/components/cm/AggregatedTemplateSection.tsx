import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Eye, Loader2, Mail, CheckCircle, TrendingUp, FileText } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface StartupResult {
  id: string;
  name: string;
  email: string;
  averageScore: number;
  feedbackSummary: string;
  feedbackStatus: 'draft' | 'reviewed' | 'approved' | 'sent';
}
interface CommunicationTemplate {
  id: string;
  type: string;
  subject: string;
  content: string;
}
interface AggregatedTemplateSectionProps {
  selectedStartups: StartupResult[];
  rejectedStartups: StartupResult[];
  top100FeedbackStartups: StartupResult[];
  currentRound: 'screeningRound' | 'pitchingRound';
  templates: CommunicationTemplate[];
  onTemplateUpdate: (type: 'selected' | 'rejected' | 'top-100-feedback', template: {
    subject: string;
    content: string;
    insights?: string;
  }) => void;
  onBatchGenerateFeedback: (type: 'selected' | 'rejected' | 'top-100-feedback') => Promise<void>;
  onBatchApproveFeedback: (type: 'selected' | 'rejected' | 'top-100-feedback') => void;
  onBatchEnhanceFeedback: (type: 'selected' | 'rejected' | 'top-100-feedback') => Promise<void>;
  batchGenerating: boolean;
  batchApproving: boolean;
  batchEnhancing: boolean;
}
export const AggregatedTemplateSection = ({
  selectedStartups,
  rejectedStartups,
  top100FeedbackStartups,
  currentRound,
  templates,
  onTemplateUpdate,
  onBatchGenerateFeedback,
  onBatchApproveFeedback,
  onBatchEnhanceFeedback,
  batchGenerating,
  batchApproving,
  batchEnhancing
}: AggregatedTemplateSectionProps) => {
  const [enhancing, setEnhancing] = useState<'selected' | 'rejected' | 'top-100-feedback' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'selected' | 'rejected' | 'top-100-feedback' | null>(null);
  const [feedbackPreviewOpen, setFeedbackPreviewOpen] = useState(false);
  const [feedbackPreviewType, setFeedbackPreviewType] = useState<'selected' | 'rejected' | 'top-100-feedback' | null>(null);
  const [enhancedInsights, setEnhancedInsights] = useState<{
    selected?: string;
    rejected?: string;
    'top-100-feedback'?: string;
  }>({});
  const getTemplate = (type: 'selected' | 'rejected' | 'top-100-feedback') => {
    return templates.find(t => t.type === type) || {
      subject: '',
      content: ''
    };
  };
  const handleImproveWithAI = async (type: 'selected' | 'rejected' | 'top-100-feedback') => {
    setEnhancing(type);
    try {
      const startups = type === 'selected' ? selectedStartups : type === 'rejected' ? rejectedStartups : top100FeedbackStartups;
      const startupIds = startups.map(s => s.id);
      if (startupIds.length === 0) {
        toast.error(`No ${type} startups to enhance template for`);
        return;
      }
      const currentTemplate = getTemplate(type);
      const {
        data,
        error
      } = await supabase.functions.invoke('enhance-batch-communication', {
        body: {
          communicationType: type,
          roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
          currentTemplate: currentTemplate.content,
          startupIds
        }
      });
      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || 'Failed to enhance template');
      }

      // Update template with AI-enhanced version
      onTemplateUpdate(type, {
        subject: data.enhancedTemplate.subject,
        content: data.enhancedTemplate.body,
        insights: data.enhancedTemplate.aggregatedInsights
      });
      setEnhancedInsights(prev => ({
        ...prev,
        [type]: data.enhancedTemplate.aggregatedInsights
      }));
      toast.success(`Template enhanced with AI insights from ${data.metadata.startupCount} evaluations`, {
        description: `Average score: ${data.metadata.averageScore.toFixed(2)} • ${data.metadata.evaluationCount} evaluations analyzed`
      });
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      toast.error('Failed to enhance template with AI', {
        description: error.message || 'Please try again'
      });
    } finally {
      setEnhancing(null);
    }
  };
  const handlePreview = (type: 'selected' | 'rejected' | 'top-100-feedback') => {
    setPreviewType(type);
    setPreviewOpen(true);
  };
  const handleFeedbackPreview = (type: 'selected' | 'rejected' | 'top-100-feedback') => {
    setFeedbackPreviewType(type);
    setFeedbackPreviewOpen(true);
  };
  const getFeedbackStats = (startups: StartupResult[]) => {
    const missingCount = startups.filter(s => s.feedbackSummary.includes('[AI Feedback not yet generated')).length;
    const generatedCount = startups.filter(s => !s.feedbackSummary.includes('[AI Feedback not yet generated') && (s.feedbackStatus === 'draft' || s.feedbackStatus === 'reviewed')).length;
    const approvedCount = startups.filter(s => s.feedbackStatus === 'approved').length;
    return {
      missingCount,
      generatedCount,
      approvedCount,
      total: startups.length
    };
  };
  const renderTemplateCard = (type: 'selected' | 'rejected' | 'top-100-feedback') => {
    const startups = type === 'selected' ? selectedStartups : type === 'rejected' ? rejectedStartups : top100FeedbackStartups;
    const template = getTemplate(type);
    const insights = enhancedInsights[type];
    const isEnhancing = enhancing === type;
    
    const cardConfig = {
      'top-100-feedback': {
        title: 'Top 100 VC Feedback',
        description: 'Comprehensive VC evaluation feedback with detailed sections',
        variant: 'default' as const,
        icon: FileText
      },
      'selected': {
        title: 'Selected Startups',
        description: 'Batch template for congratulations emails',
        variant: 'default' as const,
        icon: Mail
      },
      'rejected': {
        title: 'Rejected Startups',
        description: 'Batch template for feedback emails',
        variant: 'secondary' as const,
        icon: Mail
      }
    };
    
    const config = cardConfig[type];
    const IconComponent = config.icon;
    
    return <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconComponent className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {config.title}
              </CardTitle>
            </div>
            <Badge variant={config.variant}>
              {startups.length} startups
            </Badge>
          </div>
          <CardDescription>
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights && <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-1">AI Aggregated Insights</p>
                  <p className="text-xs text-muted-foreground">{insights}</p>
                </div>
              </div>
            </div>}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject Line</Label>
            <div className="text-sm text-foreground bg-muted/50 rounded-md p-2">
              {template.subject || 'No subject set'}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Email Content Preview</Label>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
              {template.content ? <div className="whitespace-pre-wrap">{template.content.substring(0, 300)}...</div> : <em>No template content</em>}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => handleImproveWithAI(type)} disabled={isEnhancing || startups.length === 0} className="flex-1" variant="default">
              {isEnhancing ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enhancing with AI...
                </> : <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Improve with AI
                </>}
            </Button>
            <Button onClick={() => handlePreview(type)} variant="outline" disabled={startups.length === 0}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>;
  };
  const renderPreviewDialog = () => {
    if (!previewType) return null;
    const startups = previewType === 'selected' ? selectedStartups : previewType === 'rejected' ? rejectedStartups : top100FeedbackStartups;
    const template = getTemplate(previewType);
    const previewStartups = startups.slice(0, 3);
    return <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Individual Emails</DialogTitle>
            <DialogDescription>
              See how the template will be personalized for each startup (showing first 3 of {startups.length})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {previewStartups.map((startup, idx) => <Card key={startup.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{startup.name}</CardTitle>
                    <Badge variant="outline">{startup.email}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Subject:</Label>
                    <p className="text-sm font-medium mt-1">
                      {template.subject.replace('[STARTUP_NAME]', startup.name)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Body Preview:</Label>
                    <div className="text-sm mt-1 bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                      {template.content.replace('[STARTUP_NAME]', startup.name).replace('[FEEDBACK_SUMMARY]', startup.feedbackSummary || 'Individual feedback will be inserted here').replace('[SCORE]', startup.averageScore?.toFixed(1) || 'N/A').substring(0, 400)}
                      ...
                    </div>
                  </div>
                </CardContent>
              </Card>)}

            {startups.length > 3 && <p className="text-sm text-muted-foreground text-center">
                And {startups.length - 3} more startups...
              </p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>;
  };
  const renderFeedbackProgressSection = () => {
    const top100Stats = getFeedbackStats(top100FeedbackStartups);
    const selectedStats = getFeedbackStats(selectedStartups);
    const rejectedStats = getFeedbackStats(rejectedStartups);
    
    const renderProgressRow = (type: 'selected' | 'rejected' | 'top-100-feedback', stats: ReturnType<typeof getFeedbackStats>) => {
      const rowConfig = {
        'top-100-feedback': { label: 'Top 100 VC Feedback', icon: FileText },
        'selected': { label: 'Selected Startups', icon: CheckCircle },
        'rejected': { label: 'Rejected Startups', icon: Mail }
      };
      
      const config = rowConfig[type];
      const progress = stats.total > 0 ? stats.approvedCount / stats.total * 100 : 0;
      return <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <config.icon className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">
                {config.label} ({stats.total})
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-destructive">● {stats.missingCount} missing</span>
              <span className="text-warning">● {stats.generatedCount} draft</span>
              <span className="text-success">● {stats.approvedCount} approved</span>
            </div>
          </div>
          
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-success h-full transition-all duration-500" style={{
            width: `${progress}%`
          }} />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => onBatchGenerateFeedback(type)} disabled={batchGenerating || stats.missingCount === 0} size="sm" variant="outline">
              {batchGenerating ? <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </> : <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate Missing ({stats.missingCount})
                </>}
            </Button>
            <Button onClick={() => onBatchEnhanceFeedback(type)} disabled={batchEnhancing || stats.generatedCount === 0} size="sm" variant="secondary">
              {batchEnhancing ? <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Enhancing...
                </> : <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Enhance All ({stats.generatedCount})
                </>}
            </Button>
            <Button onClick={() => handleFeedbackPreview(type)} disabled={stats.total === 0} size="sm" variant="outline">
              <Eye className="h-3 w-3 mr-1" />
              Preview All
            </Button>
            <Button onClick={() => onBatchApproveFeedback(type)} disabled={batchApproving || stats.generatedCount === 0} size="sm" variant="default">
              {batchApproving ? <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Approving...
                </> : <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve All ({stats.generatedCount})
                </>}
            </Button>
          </div>
        </div>;
    };
    return <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Individual Feedback Summaries</CardTitle>
          </div>
          <CardDescription>
            Generate and approve personalized feedback for each startup before sending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderProgressRow('top-100-feedback', top100Stats)}
          {renderProgressRow('selected', selectedStats)}
          {renderProgressRow('rejected', rejectedStats)}
        </CardContent>
      </Card>;
  };
  const renderFeedbackPreviewModal = () => {
    if (!feedbackPreviewType) return null;
    const startups = feedbackPreviewType === 'selected' ? selectedStartups : feedbackPreviewType === 'rejected' ? rejectedStartups : top100FeedbackStartups;
    
    const typeLabel = feedbackPreviewType === 'top-100-feedback' ? 'Top 100 VC Feedback' : feedbackPreviewType === 'selected' ? 'Selected' : 'Rejected';
    return <Dialog open={feedbackPreviewOpen} onOpenChange={setFeedbackPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Feedback Summaries - {typeLabel} Startups</DialogTitle>
            <DialogDescription>
              Review all {startups.length} feedback summaries. Approve or regenerate as needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {startups.map(startup => {
            const isMissing = startup.feedbackSummary.includes('[AI Feedback not yet generated');
            const isDraft = !isMissing && (startup.feedbackStatus === 'draft' || startup.feedbackStatus === 'reviewed');
            const isApproved = startup.feedbackStatus === 'approved';
            return <Card key={startup.id} className={isMissing ? 'border-destructive/50' : isDraft ? 'border-warning/50' : 'border-success/50'}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{startup.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{startup.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isMissing ? 'destructive' : isDraft ? 'secondary' : 'default'}>
                          {isMissing ? 'Not Generated' : isDraft ? 'Needs Approval' : 'Approved'}
                        </Badge>
                        <Badge variant="outline">
                          Score: {startup.averageScore.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-muted/50 rounded-md p-3 text-sm max-h-32 overflow-y-auto">
                      {isMissing ? <p className="text-muted-foreground italic">
                          Feedback not yet generated. Use "Generate Missing" button to create.
                        </p> : <div className="whitespace-pre-wrap">{startup.feedbackSummary}</div>}
                    </div>
                  </CardContent>
                </Card>;
          })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>;
  };
  return <>
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Communication Templates</h3>
          <Badge variant="outline" className="ml-auto">
            AI-Enhanced
          </Badge>
        </div>
        
        <div className="space-y-4">
          <div className="w-full">
            {renderTemplateCard('top-100-feedback')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderTemplateCard('selected')}
            {renderTemplateCard('rejected')}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          💡 Use AI to analyze all evaluations and generate improved, personalized templates. Templates will include aggregated insights and common patterns.
        </p>
      </div>

      {renderFeedbackProgressSection()}

      {renderPreviewDialog()}
      {renderFeedbackPreviewModal()}
    </>;
};