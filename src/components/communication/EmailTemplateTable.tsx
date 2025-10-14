import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  Edit, 
  Eye,
  Save,
  Search,
  Filter,
  MessageSquare,
  Activity
} from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  variables: any;
  is_active: boolean;
  lifecycle_stage?: string;
  evaluation_phase?: string;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

interface TemplateUsage {
  template_id: string;
  usage_count: number;
  last_used: string;
  success_rate: number;
}

export const EmailTemplateTable = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate>>({});
  const [previewData, setPreviewData] = useState({ subject: '', body: '' });

  useEffect(() => {
    fetchTemplates();
    fetchTemplateUsage();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('trigger_priority', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('email_communications')
        .select('template_id, status, created_at')
        .not('template_id', 'is', null);

      if (error) throw error;

      // Calculate usage statistics
      const usageMap = new Map<string, { count: number; lastUsed: string; successful: number; total: number }>();
      
      data?.forEach(comm => {
        const existing = usageMap.get(comm.template_id) || { count: 0, lastUsed: '', successful: 0, total: 0 };
        existing.count += 1;
        existing.total += 1;
        if (comm.status === 'delivered' || comm.status === 'opened' || comm.status === 'clicked') {
          existing.successful += 1;
        }
        if (!existing.lastUsed || comm.created_at > existing.lastUsed) {
          existing.lastUsed = comm.created_at;
        }
        usageMap.set(comm.template_id, existing);
      });

      const usage = Array.from(usageMap.entries()).map(([template_id, stats]) => ({
        template_id,
        usage_count: stats.count,
        last_used: stats.lastUsed,
        success_rate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
      }));

      setTemplateUsage(usage);
    } catch (error) {
      console.error('Error fetching template usage:', error);
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
    const sampleData = {
      recipientName: 'John Doe',
      roundName: 'Screening',
      startupName: 'TechCorp Inc.',
      completionRate: '75',
      averageScore: '8.2',
      jurorName: 'Jane Smith',
      meetingDate: '2024-02-15',
      calendlyLink: 'https://calendly.com/example'
    };

    let previewSubject = template.subject_template;
    let previewBody = template.body_template;

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
      'juror-welcome': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'juror-access': 'bg-green-500/10 text-green-600 border-green-500/20',
      'juror-reminder': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      'juror-completion': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      'pitch-invitation': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'pitch-reminder': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
      'juror-final-thankyou': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      'assignment-notification': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'evaluation-reminder': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      'urgent-reminder': 'bg-red-500/10 text-red-600 border-red-500/20',
      'results-communication': 'bg-green-500/10 text-green-600 border-green-500/20',
      'meeting-scheduling': 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    };

    const displayName = category
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    return (
      <Badge variant="outline" className={variants[category] || 'bg-muted text-muted-foreground'}>
        {displayName}
      </Badge>
    );
  };

  const getTemplateUsage = (templateId: string) => {
    return templateUsage.find(u => u.template_id === templateId);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && template.is_active) ||
                         (statusFilter === 'inactive' && !template.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [...new Set(templates.map(t => t.category))];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Manage all email templates across different communication stages and rounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Stage/Phase</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map(template => {
                  const usage = getTemplateUsage(template.id);
                  return (
                    <TableRow key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {template.display_order ? `#${template.display_order}` : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        {template.is_active ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                            ✅ Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            ⚠️ Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getCategoryBadge(template.category)}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.subject_template}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {template.lifecycle_stage && (
                            <Badge variant="outline" className="text-xs">
                              {template.lifecycle_stage}
                            </Badge>
                          )}
                          {template.evaluation_phase && (
                            <Badge variant="outline" className="text-xs">
                              {template.evaluation_phase}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{usage?.usage_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {usage && (
                          <Badge variant={usage.success_rate >= 80 ? "default" : usage.success_rate >= 60 ? "secondary" : "destructive"}>
                            {usage.success_rate.toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePreviewTemplate(template)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No templates found matching your criteria.
            </div>
          )}
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
              <div className="bg-muted rounded-lg overflow-hidden">
                {(() => {
                  const isFullHtmlDoc = /<!doctype html|<html/i.test(previewData.body);
                  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(previewData.body);
                  
                  if (isFullHtmlDoc) {
                    // Full HTML document - render in iframe
                    return (
                      <iframe 
                        srcDoc={previewData.body}
                        className="w-full h-96 border-0"
                        title="Email Preview"
                      />
                    );
                  } else if (hasHtmlTags) {
                    // Partial HTML - render in div
                    return (
                      <div className="p-4 max-h-96 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                      </div>
                    );
                  } else {
                    // Plain text - convert newlines to breaks
                    return (
                      <div className="p-4 max-h-96 overflow-y-auto whitespace-pre-wrap">
                        {previewData.body}
                      </div>
                    );
                  }
                })()}
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