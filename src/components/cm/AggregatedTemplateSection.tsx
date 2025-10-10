import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail, CheckCircle, Eye, FileText, Sparkles, Send } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
interface StartupResult {
  id: string;
  name: string;
  email: string;
  averageScore: number;
  feedbackSummary: string;
  feedbackStatus: 'draft' | 'reviewed' | 'approved' | 'sent';
}
interface AggregatedTemplateSectionProps {
  top100FeedbackStartups: StartupResult[];
  currentRound: 'screeningRound' | 'pitchingRound';
  onBatchGenerateFeedback: (type: 'top-100-feedback') => Promise<void>;
  onBatchApproveFeedback: (type: 'top-100-feedback') => void;
  onBatchEnhanceFeedback: (type: 'top-100-feedback') => Promise<void>;
  onSendCommunication: (type: 'top-100-feedback') => Promise<void>;
  batchGenerating: boolean;
  batchApproving: boolean;
  batchEnhancing: boolean;
}
export const AggregatedTemplateSection = ({
  top100FeedbackStartups,
  currentRound,
  onBatchGenerateFeedback,
  onBatchApproveFeedback,
  onBatchEnhanceFeedback,
  onSendCommunication,
  batchGenerating,
  batchApproving,
  batchEnhancing
}: AggregatedTemplateSectionProps) => {
  const [feedbackPreviewOpen, setFeedbackPreviewOpen] = useState(false);
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [emailPreviews, setEmailPreviews] = useState<Array<{
    startupId: string;
    startupName: string;
    email: string;
    previewHtml: string;
    status: 'approved' | 'draft' | 'missing';
  }>>([]);

  const loadAllHTMLPreviews = async () => {
    setLoadingPreviews(true);
    try {
      const { data: customEmails, error } = await supabase
        .from('startup_custom_emails')
        .select('startup_id, preview_html, is_approved')
        .eq('round_name', currentRound === 'screeningRound' ? 'screening' : 'pitching')
        .eq('communication_type', 'top-100-feedback')
        .in('startup_id', top100FeedbackStartups.map(s => s.id));

      if (error) throw error;

      const previewsMap = new Map(
        customEmails?.map(ce => [ce.startup_id, { 
          html: ce.preview_html, 
          isApproved: ce.is_approved 
        }]) || []
      );

      const previews = top100FeedbackStartups.map(startup => ({
        startupId: startup.id,
        startupName: startup.name,
        email: startup.email,
        previewHtml: previewsMap.get(startup.id)?.html || '<p>Email preview not yet generated. Please generate and approve VC feedback first.</p>',
        status: previewsMap.get(startup.id)?.isApproved ? 'approved' as const : 
                previewsMap.get(startup.id)?.html ? 'draft' as const : 
                'missing' as const
      }));

      setEmailPreviews(previews);
      setHtmlPreviewOpen(true);
    } catch (error) {
      console.error('Error loading email previews:', error);
      toast.error('Failed to load email previews');
    } finally {
      setLoadingPreviews(false);
    }
  };

  const handleFeedbackPreview = () => {
    loadAllHTMLPreviews();
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
  const renderFeedbackProgressSection = () => {
    const top100Stats = getFeedbackStats(top100FeedbackStartups);
    
    const renderProgressRow = (stats: ReturnType<typeof getFeedbackStats>) => {
      const progress = stats.total > 0 ? stats.approvedCount / stats.total * 100 : 0;
      return <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">
                Top 100 VC Feedback ({stats.total})
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
            <Button 
              onClick={() => handleFeedbackPreview()} 
              disabled={stats.total === 0 || loadingPreviews} 
              size="sm" 
              variant="outline"
            >
              {loadingPreviews ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview All
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => onSendCommunication('top-100-feedback')} 
              disabled={stats.approvedCount === 0} 
              size="sm" 
              variant="default"
            >
              <Send className="h-3 w-3 mr-1" />
              Send Communication ({stats.approvedCount})
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
          {renderProgressRow(top100Stats)}
        </CardContent>
      </Card>;
  };
  const renderFeedbackPreviewModal = () => {
    return <Dialog open={feedbackPreviewOpen} onOpenChange={setFeedbackPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Feedback Summaries - Top 100 VC Feedback</DialogTitle>
            <DialogDescription>
              Review all {top100FeedbackStartups.length} feedback summaries. Approve or regenerate as needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {top100FeedbackStartups.map(startup => {
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
  const renderHTMLPreviewModal = () => {
    return (
      <Dialog open={htmlPreviewOpen} onOpenChange={setHtmlPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview - Top 100 VC Feedback (Full HTML)</DialogTitle>
            <DialogDescription>
              Preview all {emailPreviews.length} emails in full HTML format as they will be sent to founders
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
              {emailPreviews.map((preview, index) => (
                <div key={preview.startupId} className="space-y-2">
                  {index > 0 && <Separator className="my-6" />}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{preview.startupName}</h3>
                      <p className="text-sm text-muted-foreground">{preview.email}</p>
                    </div>
                    <Badge 
                      variant={
                        preview.status === 'approved' ? 'default' :
                        preview.status === 'draft' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {preview.status === 'approved' ? 'Approved' : 
                       preview.status === 'draft' ? 'Draft' : 
                       'Missing'}
                    </Badge>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <div 
                      className="email-preview-content"
                      dangerouslySetInnerHTML={{ __html: preview.previewHtml }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHtmlPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return <>
      {renderFeedbackProgressSection()}
      {renderHTMLPreviewModal()}
    </>;
};