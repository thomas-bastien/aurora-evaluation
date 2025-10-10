import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye, Edit, CheckCircle, XCircle, RefreshCw, AlertCircle } from "lucide-react";

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: string;
  startupName: string;
  roundName: 'screening' | 'pitching';
  communicationType: 'top-100-feedback' | 'selected' | 'rejected' | 'under-review';
  onEmailStatusChange?: () => void;
}

interface CustomEmail {
  id: string;
  custom_subject: string | null;
  custom_body: string | null;
  preview_html: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export const EmailPreviewModal = ({
  open,
  onOpenChange,
  startupId,
  startupName,
  roundName,
  communicationType,
  onEmailStatusChange
}: EmailPreviewModalProps) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customEmail, setCustomEmail] = useState<CustomEmail | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  useEffect(() => {
    if (open) {
      loadOrGeneratePreview();
    }
  }, [open, startupId]);

  const loadOrGeneratePreview = async () => {
    setLoading(true);
    try {
      // Check if custom email already exists
      const { data: existing, error: fetchError } = await supabase
        .from('startup_custom_emails')
        .select('*')
        .eq('startup_id', startupId)
        .eq('round_name', roundName)
        .eq('communication_type', communicationType)
        .maybeSingle();

      // Check if approved VC feedback exists
      const { data: vcFeedback } = await supabase
        .from('startup_vc_feedback_details')
        .select('is_approved, approved_at, updated_at')
        .eq('startup_id', startupId)
        .eq('round_name', roundName)
        .maybeSingle();

      // Determine if we should auto-refresh
      const shouldRefresh =
        !existing ||
        !existing.preview_html ||
        (vcFeedback?.is_approved && 
         vcFeedback?.updated_at && 
         new Date(vcFeedback.updated_at) > new Date(existing.updated_at || 0));

      const safeToAutoRefresh = !existing?.is_approved;

      if (shouldRefresh && safeToAutoRefresh) {
        console.log('[Email Preview] Auto-refreshing from approved VC feedback');
        await generatePreview();
        toast.success('Email preview updated from approved VC feedback');
        return;
      }

      if (existing && !fetchError) {
        setCustomEmail(existing);
        setSubject(existing.custom_subject || '');
        setBody(existing.custom_body || '');
        setPreviewHtml(existing.preview_html || '');
      } else {
        // Generate new preview
        await generatePreview();
      }
    } catch (error) {
      console.error('Error loading email preview:', error);
      toast.error('Failed to load email preview');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async (isManualRefresh = false) => {
    const loadingState = isManualRefresh ? setRefreshing : setGenerating;
    loadingState(true);
    try {
      const { data, error } = await supabase.functions.invoke('preview-individual-email', {
        body: {
          startupId,
          roundName,
          communicationType
        }
      });

      if (error) throw error;

      setSubject(data.subject);
      setBody(data.body);
      setPreviewHtml(data.preview_html);

      // Save to database
      const { data: saved, error: saveError } = await supabase
        .from('startup_custom_emails')
        .upsert({
          startup_id: startupId,
          round_name: roundName,
          communication_type: communicationType,
          custom_subject: data.subject,
          custom_body: data.body,
          preview_html: data.preview_html,
          is_approved: false
        }, {
          onConflict: 'startup_id,round_name,communication_type'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      setCustomEmail(saved);
      if (isManualRefresh) {
        toast.success('Email refreshed from VC feedback');
      } else {
        toast.success('Email preview generated');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate email preview');
    } finally {
      loadingState(false);
    }
  };

  const handleManualRefresh = async () => {
    await generatePreview(true);
  };

  const handleSaveDraft = async () => {
    if (!customEmail?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('startup_custom_emails')
        .update({
          custom_subject: subject,
          custom_body: body,
          is_approved: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', customEmail.id);

      if (error) throw error;

      setCustomEmail(prev => prev ? { ...prev, custom_subject: subject, custom_body: body, is_approved: false } : null);
      setEditing(false);
      toast.success('Draft saved');
      onEmailStatusChange?.();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!customEmail?.id) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('startup_custom_emails')
        .update({
          custom_subject: subject,
          custom_body: body,
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customEmail.id);

      if (error) throw error;

      setCustomEmail(prev => prev ? { ...prev, custom_subject: subject, custom_body: body, is_approved: true } : null);
      setEditing(false);
      toast.success(`Email approved for ${startupName}`);
      onEmailStatusChange?.();
    } catch (error) {
      console.error('Error approving email:', error);
      toast.error('Failed to approve email');
    } finally {
      setSaving(false);
    }
  };

  const getEmailStatus = () => {
    if (!customEmail) return 'not-generated';
    if (customEmail.is_approved) return 'approved';
    if (customEmail.custom_subject || customEmail.custom_body) return 'draft';
    return 'not-generated';
  };

  const status = getEmailStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Email Preview: {startupName}</DialogTitle>
              <DialogDescription>
                Review and edit the email before sending
              </DialogDescription>
            </div>
            <Badge 
              variant={
                status === 'approved' ? 'default' : 
                status === 'draft' ? 'secondary' : 
                'outline'
              }
            >
              {status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
              {status === 'approved' ? 'Approved' : status === 'draft' ? 'Draft' : 'Not Generated'}
            </Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subject Line */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              {editing ? (
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              ) : (
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {subject || 'No subject'}
                </div>
              )}
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Email Body</Label>
                {!editing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
              {editing ? (
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter email body (HTML supported)"
                  className="min-h-[300px] font-mono text-xs"
                />
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div 
                    className="p-4 bg-white prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewHtml || body || 'No content' }}
                  />
                </div>
              )}
            </div>

            {editing && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Editing mode: Preview may not update in real-time. Save to see changes.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setSubject(customEmail?.custom_subject || '');
                  setBody(customEmail?.custom_body || '');
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Draft
              </Button>
              <Button
                onClick={handleApprove}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve & Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {status !== 'approved' && (
                <Button
                  variant="secondary"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Refresh from VC Feedback
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setEditing(true)}
                disabled={status === 'approved'}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Email
              </Button>
              {status !== 'approved' && (
                <Button
                  onClick={handleApprove}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

