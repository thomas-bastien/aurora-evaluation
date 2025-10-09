import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Mail, CheckCircle, Eye, FileText, Sparkles } from "lucide-react";
import { toast } from 'sonner';
interface StartupResult {
  id: string;
  name: string;
  email: string;
  averageScore: number;
  feedbackSummary: string;
  feedbackStatus: 'draft' | 'reviewed' | 'approved' | 'sent';
}
interface AggregatedTemplateSectionProps {
  selectedStartups: StartupResult[];
  rejectedStartups: StartupResult[];
  top100FeedbackStartups: StartupResult[];
  currentRound: 'screeningRound' | 'pitchingRound';
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
  onBatchGenerateFeedback,
  onBatchApproveFeedback,
  onBatchEnhanceFeedback,
  batchGenerating,
  batchApproving,
  batchEnhancing
}: AggregatedTemplateSectionProps) => {
  const [feedbackPreviewOpen, setFeedbackPreviewOpen] = useState(false);
  const [feedbackPreviewType, setFeedbackPreviewType] = useState<'selected' | 'rejected' | 'top-100-feedback' | null>(null);
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
      {renderFeedbackProgressSection()}
      {renderFeedbackPreviewModal()}
    </>;
};