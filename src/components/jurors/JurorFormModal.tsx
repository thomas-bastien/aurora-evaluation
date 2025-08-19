import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Juror {
  id?: string;
  name: string;
  email: string;
  job_title: string | null;
  company: string | null;
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
      company: ''
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
        company: ''
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
        company: ''
      });
    }
    
    onOpenChange(false);
  };

  const isFormValid = formData.name?.trim() && formData.email?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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