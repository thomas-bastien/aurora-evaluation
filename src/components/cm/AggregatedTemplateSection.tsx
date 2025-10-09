import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Eye, Loader2, Mail, CheckCircle, TrendingUp } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StartupResult {
  id: string;
  name: string;
  email: string;
  averageScore: number;
  feedbackSummary: string;
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
  currentRound: 'screeningRound' | 'pitchingRound';
  templates: CommunicationTemplate[];
  onTemplateUpdate: (type: 'selected' | 'rejected', template: { subject: string; content: string; insights?: string }) => void;
}

export const AggregatedTemplateSection = ({
  selectedStartups,
  rejectedStartups,
  currentRound,
  templates,
  onTemplateUpdate
}: AggregatedTemplateSectionProps) => {
  const [enhancing, setEnhancing] = useState<'selected' | 'rejected' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'selected' | 'rejected' | null>(null);
  const [enhancedInsights, setEnhancedInsights] = useState<{
    selected?: string;
    rejected?: string;
  }>({});

  const getTemplate = (type: 'selected' | 'rejected') => {
    return templates.find(t => t.type === type) || { subject: '', content: '' };
  };

  const handleImproveWithAI = async (type: 'selected' | 'rejected') => {
    setEnhancing(type);
    
    try {
      const startups = type === 'selected' ? selectedStartups : rejectedStartups;
      const startupIds = startups.map(s => s.id);
      
      if (startupIds.length === 0) {
        toast.error(`No ${type} startups to enhance template for`);
        return;
      }

      const currentTemplate = getTemplate(type);
      
      const { data, error } = await supabase.functions.invoke(
        'enhance-batch-communication',
        {
          body: {
            communicationType: type,
            roundName: currentRound === 'screeningRound' ? 'screening' : 'pitching',
            currentTemplate: currentTemplate.content,
            startupIds
          }
        }
      );

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

      toast.success(
        `Template enhanced with AI insights from ${data.metadata.startupCount} evaluations`,
        {
          description: `Average score: ${data.metadata.averageScore.toFixed(2)} • ${data.metadata.evaluationCount} evaluations analyzed`
        }
      );
      
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      toast.error('Failed to enhance template with AI', {
        description: error.message || 'Please try again'
      });
    } finally {
      setEnhancing(null);
    }
  };

  const handlePreview = (type: 'selected' | 'rejected') => {
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const renderTemplateCard = (type: 'selected' | 'rejected') => {
    const startups = type === 'selected' ? selectedStartups : rejectedStartups;
    const template = getTemplate(type);
    const insights = enhancedInsights[type];
    const isEnhancing = enhancing === type;

    return (
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {type === 'selected' ? 'Selected Startups' : 'Rejected Startups'}
              </CardTitle>
            </div>
            <Badge variant={type === 'selected' ? 'default' : 'secondary'}>
              {startups.length} startups
            </Badge>
          </div>
          <CardDescription>
            Batch template for {type === 'selected' ? 'congratulations' : 'feedback'} emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-1">AI Aggregated Insights</p>
                  <p className="text-xs text-muted-foreground">{insights}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject Line</Label>
            <div className="text-sm text-foreground bg-muted/50 rounded-md p-2">
              {template.subject || 'No subject set'}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Email Content Preview</Label>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
              {template.content ? (
                <div className="whitespace-pre-wrap">{template.content.substring(0, 300)}...</div>
              ) : (
                <em>No template content</em>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleImproveWithAI(type)}
              disabled={isEnhancing || startups.length === 0}
              className="flex-1"
              variant="default"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enhancing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Improve with AI
                </>
              )}
            </Button>
            <Button
              onClick={() => handlePreview(type)}
              variant="outline"
              disabled={startups.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPreviewDialog = () => {
    if (!previewType) return null;
    
    const startups = previewType === 'selected' ? selectedStartups : rejectedStartups;
    const template = getTemplate(previewType);
    const previewStartups = startups.slice(0, 3);

    return (
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Individual Emails</DialogTitle>
            <DialogDescription>
              See how the template will be personalized for each startup (showing first 3 of {startups.length})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {previewStartups.map((startup, idx) => (
              <Card key={startup.id}>
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
                      {template.content
                        .replace('[STARTUP_NAME]', startup.name)
                        .replace('[FEEDBACK_SUMMARY]', startup.feedbackSummary || 'Individual feedback will be inserted here')
                        .replace('[SCORE]', startup.averageScore?.toFixed(1) || 'N/A')
                        .substring(0, 400)}
                      ...
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {startups.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                And {startups.length - 3} more startups...
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Batch Communication Templates</h3>
          <Badge variant="outline" className="ml-auto">
            AI-Enhanced
          </Badge>
        </div>
        
        <div className="flex gap-4">
          {renderTemplateCard('selected')}
          {renderTemplateCard('rejected')}
        </div>

        <p className="text-sm text-muted-foreground">
          💡 Use AI to analyze all evaluations and generate improved, personalized templates. Templates will include aggregated insights and common patterns.
        </p>
      </div>

      {renderPreviewDialog()}
    </>
  );
};
