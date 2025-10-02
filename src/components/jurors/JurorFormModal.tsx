import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { REGION_OPTIONS, VERTICAL_OPTIONS, STAGE_OPTIONS } from '@/constants/jurorPreferences';

interface Juror {
  id?: string;
  name: string;
  email: string;
  job_title: string | null;
  company: string | null;
  preferred_regions: string[] | null;
  target_verticals: string[] | null;
  preferred_stages: string[] | null;
  linkedin_url: string | null;
  calendly_link?: string | null;
  evaluation_limit?: number | null;
  meeting_limit?: number | null;
}

interface JurorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Juror>) => void;
  initialData?: Partial<Juror>;
  mode?: 'create' | 'edit';
}

export function JurorFormModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  mode = 'create'
}: JurorFormModalProps) {
  const [formData, setFormData] = useState<Partial<Juror>>(
    initialData || {
      name: '',
      email: '',
      job_title: '',
      company: '',
      preferred_regions: [],
      target_verticals: [],
      preferred_stages: [],
      linkedin_url: '',
      calendly_link: '',
      evaluation_limit: null,
      meeting_limit: null
    }
  );

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData(initialData);
    } else if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        job_title: '',
        company: '',
        preferred_regions: [],
        target_verticals: [],
        preferred_stages: [],
        linkedin_url: '',
        calendly_link: '',
        evaluation_limit: null,
        meeting_limit: null
      });
    }
  }, [initialData, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name?.trim() || !formData.email?.trim()) {
      return;
    }

    onSubmit(formData);
    
    // Reset form for create mode
    if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        job_title: '',
        company: '',
        preferred_regions: [],
        target_verticals: [],
        preferred_stages: [],
        linkedin_url: '',
        calendly_link: '',
        evaluation_limit: null,
        meeting_limit: null
      });
    }
    
    onOpenChange(false);
  };

  const isFormValid = formData.name?.trim() && formData.email?.trim();

  const toggleArrayItem = (array: string[] | null, item: string, field: keyof Juror) => {
    const currentArray = array || [];
    // Prevent duplicates explicitly
    if (currentArray.includes(item)) {
      // Remove item
      const newArray = currentArray.filter(i => i !== item);
      setFormData(prev => ({ ...prev, [field]: newArray }));
    } else {
      // Add item only if not already present
      const newArray = [...currentArray, item];
      setFormData(prev => ({ ...prev, [field]: newArray }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Juror' : 'Add New Juror'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="Enter full name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              placeholder="Enter email address"
            />
          </div>

          <div>
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              value={formData.job_title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
              placeholder="Enter job title"
            />
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              placeholder="Enter company name"
            />
          </div>

          <div>
            <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/in/your-profile"
            />
          </div>

          <div>
            <Label htmlFor="calendly_link">Calendly Link</Label>
            <Input
              id="calendly_link"
              type="url"
              value={formData.calendly_link || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, calendly_link: e.target.value }))}
              placeholder="https://calendly.com/your-link"
            />
          </div>

          <Separator />

          <div>
            <Label>Preferred Regions</Label>
            <p className="text-sm text-muted-foreground mb-2">Select regions you prefer to evaluate startups from</p>
            <div className="flex flex-wrap gap-2">
              {REGION_OPTIONS.map((region) => (
                <Badge
                  key={region}
                  variant={(formData.preferred_regions || []).includes(region) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem(formData.preferred_regions, region, 'preferred_regions')}
                >
                  {region}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Target Investment Verticals</Label>
            <p className="text-sm text-muted-foreground mb-2">Select industries you specialize in</p>
            <div className="flex flex-wrap gap-2">
              {VERTICAL_OPTIONS.map((vertical) => (
                <Badge
                  key={vertical}
                  variant={(formData.target_verticals || []).includes(vertical) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem(formData.target_verticals, vertical, 'target_verticals')}
                >
                  {vertical}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Preferred Startup Stages</Label>
            <p className="text-sm text-muted-foreground mb-2">Select funding stages you prefer to evaluate</p>
            <div className="flex flex-wrap gap-2">
              {STAGE_OPTIONS.map((stage) => (
                <Badge
                  key={stage}
                  variant={(formData.preferred_stages || []).includes(stage) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem(formData.preferred_stages, stage, 'preferred_stages')}
                >
                  {stage}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="evaluation_limit">Screening Evaluations Limit</Label>
              <Input
                id="evaluation_limit"
                type="number"
                min="0"
                value={formData.evaluation_limit ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, evaluation_limit: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Number of startups"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of startups willing to evaluate in screening round
              </p>
            </div>

            <div>
              <Label htmlFor="meeting_limit">Pitching Calls Limit</Label>
              <Input
                id="meeting_limit"
                type="number"
                min="0"
                value={formData.meeting_limit ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, meeting_limit: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Number of meetings"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of pitch meetings willing to attend
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid}>
              {mode === 'edit' ? 'Update Juror' : 'Add Juror'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}