import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Edit, 
  Plus, 
  Trash2, 
  Eye,
  Save,
  MessageSquare,
  Settings
} from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  variables: any; // Changed from string[] to any to handle Json type
  is_active: boolean;
  lifecycle_stage?: string;
  evaluation_phase?: string;
}

interface CommunicationTemplateManagerProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const CommunicationTemplateManager = ({ currentRound }: CommunicationTemplateManagerProps) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate>>({});
  const [previewData, setPreviewData] = useState({ subject: '', body: '' });

  useEffect(() => {
    fetchTemplates();
  }, [currentRound]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditingTemplate({
      name: template.name,
      category: template.category,
      subject_template: template.subject_template,
      body_template: template.body_template,
      variables: template.variables,
      lifecycle_stage: template.lifecycle_stage,
      evaluation_phase: template.evaluation_phase
    });
    setShowEditDialog(true);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !editingTemplate.name) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: editingTemplate.name,
          category: editingTemplate.category,
          subject_template: editingTemplate.subject_template,
          body_template: editingTemplate.body_template,
          variables: editingTemplate.variables,
          lifecycle_stage: editingTemplate.lifecycle_stage,
          evaluation_phase: editingTemplate.evaluation_phase
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast.success('Template updated successfully');
      setShowEditDialog(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    // Generate preview with sample data
    const sampleData = {
      recipientName: 'John Doe',
      roundName: currentRound === 'screeningRound' ? 'Screening' : 'Pitching',
      startupName: 'TechCorp Inc.',
      completionRate: '75',
      averageScore: '8.2'
    };

    let previewSubject = template.subject_template;
    let previewBody = template.body_template;

    // Replace variables with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      previewSubject = previewSubject.replace(pattern, value);
      previewBody = previewBody.replace(pattern, value);
    });

    setPreviewData({ subject: previewSubject, body: previewBody });
    setShowPreviewDialog(true);
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, string> = {
      'assignment-notification': 'bg-primary text-primary-foreground',
      'evaluation-reminder': 'bg-warning text-warning-foreground',
      'urgent-reminder': 'bg-destructive text-destructive-foreground',
      'results-communication': 'bg-success text-success-foreground',
      'meeting-scheduling': 'bg-accent text-accent-foreground'
    };

    return (
      <Badge className={variants[category] || 'bg-muted text-muted-foreground'}>
        {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Email Template Management
          </CardTitle>
          <CardDescription>
            Manage email templates for {currentRound === 'screeningRound' ? 'screening' : 'pitching'} round communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={Object.keys(templatesByCategory)[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {Object.keys(templatesByCategory).map(category => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                {categoryTemplates.map(template => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            {getCategoryBadge(template.category)}
                            {template.lifecycle_stage && (
                              <Badge variant="outline">{template.lifecycle_stage}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreviewTemplate(template)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium">Subject:</div>
                        <div className="truncate">{template.subject_template}</div>
                        {template.variables && Array.isArray(template.variables) && template.variables.length > 0 && (
                          <div className="mt-2">
                            <span className="font-medium">Variables: </span>
                            {Array.isArray(template.variables) ? template.variables.join(', ') : 'None'}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Modify the email template content and variables
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={editingTemplate.category || ''}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, category: e.target.value }))}
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject Template</label>
              <Input
                value={editingTemplate.subject_template || ''}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, subject_template: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Body Template</label>
              <Textarea
                value={editingTemplate.body_template || ''}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, body_template: e.target.value }))}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Available Variables:</strong> {Array.isArray(editingTemplate.variables) ? editingTemplate.variables.join(', ') : 'None'}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview of the email with sample data
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject:</label>
              <div className="p-3 bg-muted rounded-lg">
                {previewData.subject}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Body:</label>
              <div className="p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};