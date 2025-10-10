import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, FileText, Save, ThumbsUp, Sparkles, Edit } from "lucide-react";

interface VCFeedbackDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: string;
  startupName: string;
  roundName: 'screening' | 'pitching';
  onStatusChange?: () => void;
}

interface VCFeedbackData {
  id: string;
  plain_text_feedback: string;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  evaluation_count: number;
  created_at: string;
  updated_at: string;
}

export function VCFeedbackDetailsModal({
  open,
  onOpenChange,
  startupId,
  startupName,
  roundName,
  onStatusChange,
}: VCFeedbackDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [feedbackData, setFeedbackData] = useState<VCFeedbackData | null>(null);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [originalFeedback, setOriginalFeedback] = useState("");
  const [lastEnhanceTime, setLastEnhanceTime] = useState(0);

  useEffect(() => {
    if (open) {
      loadFeedback();
    }
  }, [open, startupId, roundName]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('startup_vc_feedback_details')
        .select('*')
        .eq('startup_id', startupId)
        .eq('round_name', roundName)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFeedbackData(data);
        setEditedFeedback(data.plain_text_feedback);
        setOriginalFeedback(data.plain_text_feedback);
        setIsEditing(false);
      } else {
        setFeedbackData(null);
        setEditedFeedback("");
        setOriginalFeedback("");
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Error loading VC feedback:', error);
      toast({
        title: "Error",
        description: "Failed to load VC feedback details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vc-feedback-details', {
        body: {
          startupId,
          roundName,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "No Evaluations",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Generated feedback from ${data.evaluationCount} evaluation(s)`,
      });

      await loadFeedback();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Error generating VC feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate VC feedback",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!feedbackData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('startup_vc_feedback_details')
        .update({
          plain_text_feedback: editedFeedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackData.id);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "VC feedback draft saved successfully",
      });

      await loadFeedback();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Error saving VC feedback:', error);
      toast({
        title: "Error",
        description: "Failed to save VC feedback draft",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnhance = async () => {
    if (!feedbackData) return;

    // Phase 1: Request debouncing (2 second cooldown)
    const now = Date.now();
    if (now - lastEnhanceTime < 2000) {
      toast({
        title: "Please Wait",
        description: "Enhancement in progress, please wait a moment",
      });
      return;
    }
    setLastEnhanceTime(now);

    setEnhancing(true);
    const enhanceStartTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('enhance-feedback-summary', {
        body: {
          feedbackSummary: editedFeedback,
          startupName,
          roundName,
          communicationType: 'vc-feedback-details',
          startupId, // Pass for caching
        },
      });

      if (error) throw error;

      if (data.success) {
        setEditedFeedback(data.enhancedFeedback);
        const timeTaken = data.metadata?.timeTaken || (Date.now() - enhanceStartTime);
        const mode = data.metadata?.mode || 'unknown';
        
        toast({
          title: mode === 'cached' ? "✨ Enhanced (from cache)" : "✨ Enhanced with AI",
          description: `${data.improvements.join('. ')}. Completed in ${(timeTaken / 1000).toFixed(1)}s.`,
        });
      } else {
        throw new Error(data.error || 'Enhancement failed');
      }
    } catch (error: any) {
      console.error('Error enhancing VC feedback:', error);
      const raw = typeof error?.message === 'string' ? error.message : '';
      const description = raw?.includes('non-2xx')
        ? 'AI enhancement failed. The system now uses parallel processing and caching for better performance. Please try again.'
        : (raw || 'Failed to enhance VC feedback');
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setEnhancing(false);
    }
  };

  const handleApprove = async () => {
    if (!feedbackData) return;

    setApproving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('startup_vc_feedback_details')
        .update({
          plain_text_feedback: editedFeedback,
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackData.id);

      if (error) throw error;

      toast({
        title: "Approved",
        description: "VC feedback approved and ready for email",
      });

      await loadFeedback();
      onStatusChange?.();
    } catch (error: any) {
      console.error('Error approving VC feedback:', error);
      toast({
        title: "Error",
        description: "Failed to approve VC feedback",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedFeedback(originalFeedback);
    setIsEditing(false);
  };

  const getStatus = () => {
    if (!feedbackData) return 'not-generated';
    if (feedbackData.is_approved) return 'approved';
    return 'draft';
  };

  const status = getStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            VC Feedback Details: {startupName}
          </DialogTitle>
          <DialogDescription>
            Review and approve detailed VC feedback in plain text format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge
                variant={status === 'approved' ? 'default' : status === 'draft' ? 'secondary' : 'outline'}
              >
                {status === 'approved' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approved
                  </>
                ) : status === 'draft' ? (
                  'Draft'
                ) : (
                  'Not Generated'
                )}
              </Badge>
              {feedbackData && (
                <span className="text-sm text-muted-foreground">
                  ({feedbackData.evaluation_count} evaluation{feedbackData.evaluation_count !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Round: <span className="capitalize">{roundName}</span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Not Generated State */}
          {!loading && !feedbackData && (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                No VC feedback has been generated yet for this startup.
              </p>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate VC Feedback
              </Button>
            </div>
          )}

          {/* Feedback Editor */}
          {!loading && feedbackData && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plain Text VC Feedback</label>
                <Textarea
                  value={editedFeedback}
                  onChange={(e) => setEditedFeedback(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="VC feedback will appear here..."
                  disabled={status === 'approved' && !isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  Edit the feedback sections as needed. Each VC's feedback is separated by a line.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={generating || saving || approving || enhancing || isEditing}
                  >
                    {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Regenerate
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleEnhance}
                    disabled={enhancing || saving || approving || (status === 'approved' && !isEditing) || !editedFeedback}
                  >
                    {enhancing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </Button>
                </div>

                <div className="flex gap-2">
                  {status === 'approved' && !isEditing && (
                    <Button
                      variant="outline"
                      onClick={handleEdit}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  
                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={saving || approving || enhancing}
                    >
                      Cancel
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={saving || approving || enhancing || (status === 'approved' && !isEditing)}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>

                  <Button
                    onClick={handleApprove}
                    disabled={approving || saving || enhancing || (status === 'approved' && !isEditing)}
                  >
                    {approving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {status === 'approved' && !isEditing ? 'Approved' : 'Approve'}
                  </Button>
                </div>
              </div>

              {status === 'approved' && feedbackData.approved_at && !isEditing && (
                <p className="text-xs text-muted-foreground text-center">
                  Approved on {new Date(feedbackData.approved_at).toLocaleString()}
                </p>
              )}

              {isEditing && (
                <p className="text-xs text-amber-600 text-center">
                  ⚠️ Editing approved feedback. Save as draft or re-approve after making changes.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
