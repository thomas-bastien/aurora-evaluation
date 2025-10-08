import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface CommunityManager {
  id?: string;
  name: string;
  email: string;
  job_title: string | null;
  organization: string | null;
  linkedin_url: string | null;
  permissions: {
    can_manage_startups: boolean;
    can_manage_jurors: boolean;
    can_invite_cms: boolean;
  };
}

interface CMFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<CommunityManager>) => void;
  initialData?: Partial<CommunityManager>;
  mode?: 'create' | 'edit';
}

export function CMFormModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  mode = 'create'
}: CMFormModalProps) {
  const [formData, setFormData] = useState<Partial<CommunityManager>>(
    initialData || {
      name: '',
      email: '',
      job_title: '',
      organization: '',
      linkedin_url: '',
      permissions: {
        can_manage_startups: true,
        can_manage_jurors: true,
        can_invite_cms: false
      }
    }
  );

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        ...initialData,
        permissions: initialData.permissions || {
          can_manage_startups: true,
          can_manage_jurors: true,
          can_invite_cms: false
        }
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        job_title: '',
        organization: '',
        linkedin_url: '',
        permissions: {
          can_manage_startups: true,
          can_manage_jurors: true,
          can_invite_cms: false
        }
      });
    }
  }, [initialData, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim() || !formData.email?.trim()) {
      return;
    }

    onSubmit(formData);
    
    if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        job_title: '',
        organization: '',
        linkedin_url: '',
        permissions: {
          can_manage_startups: true,
          can_manage_jurors: true,
          can_invite_cms: false
        }
      });
    }
    
    onOpenChange(false);
  };

  const isFormValid = formData.name?.trim() && formData.email?.trim();

  const updatePermission = (key: keyof typeof formData.permissions, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions!,
        [key]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Community Manager' : 'Add New Community Manager'}
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
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              value={formData.organization || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
              placeholder="Enter organization name"
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

          <Separator />

          <div>
            <Label className="text-base font-semibold">Permissions</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Configure what actions this Community Manager can perform
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_manage_startups"
                  checked={formData.permissions?.can_manage_startups || false}
                  onCheckedChange={(checked) => updatePermission('can_manage_startups', checked as boolean)}
                />
                <Label htmlFor="can_manage_startups" className="cursor-pointer font-normal">
                  Can manage startups
                  <span className="text-xs text-muted-foreground block">
                    Add, edit, and manage startup applications
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_manage_jurors"
                  checked={formData.permissions?.can_manage_jurors || false}
                  onCheckedChange={(checked) => updatePermission('can_manage_jurors', checked as boolean)}
                />
                <Label htmlFor="can_manage_jurors" className="cursor-pointer font-normal">
                  Can manage jurors
                  <span className="text-xs text-muted-foreground block">
                    Add, edit, and manage jury members
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_invite_cms"
                  checked={formData.permissions?.can_invite_cms || false}
                  onCheckedChange={(checked) => updatePermission('can_invite_cms', checked as boolean)}
                />
                <Label htmlFor="can_invite_cms" className="cursor-pointer font-normal">
                  Can invite other Community Managers
                  <span className="text-xs text-muted-foreground block">
                    Send invitations to add more CMs to the platform
                  </span>
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid}>
              {mode === 'edit' ? 'Update CM' : 'Add CM'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
