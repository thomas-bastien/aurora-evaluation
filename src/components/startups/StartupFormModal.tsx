import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface Startup {
  name: string;
  description: string;
  industry: string;
  stage: string;
  location: string;
  founded_year: number;
  team_size: number;
  funding_goal: number;
  funding_raised: number;
  website: string;
  contact_email: string;
  contact_phone: string;
  founder_names: string[];
  status: string;
}

interface StartupFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Startup>) => void;
  initialData?: Partial<Startup>;
  mode?: 'create' | 'edit';
}

export function StartupFormModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  mode = 'create'
}: StartupFormModalProps) {
  const [formData, setFormData] = useState<Partial<Startup>>(
    initialData || {
      founder_names: [],
      status: 'pending'
    }
  );

  const [founderInput, setFounderInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    if (mode === 'create') {
      setFormData({ founder_names: [], status: 'pending' });
      setFounderInput('');
    }
    onOpenChange(false);
  };

  const addFounder = () => {
    if (founderInput.trim()) {
      setFormData(prev => ({
        ...prev,
        founder_names: [...(prev.founder_names || []), founderInput.trim()]
      }));
      setFounderInput('');
    }
  };

  const removeFounder = (index: number) => {
    setFormData(prev => ({
      ...prev,
      founder_names: prev.founder_names?.filter((_, i) => i !== index) || []
    }));
  };

  const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce', 'SaaS', 'AI/ML', 'Biotech', 'CleanTech', 'Other'];
  const stages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'];
  const statuses = ['pending', 'under-review', 'shortlisted', 'rejected'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Startup' : 'Add New Startup'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={formData.industry || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={formData.stage || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage} value={stage}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="founded_year">Founded Year</Label>
              <Input
                id="founded_year"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.founded_year || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, founded_year: parseInt(e.target.value) || undefined }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="team_size">Team Size</Label>
              <Input
                id="team_size"
                type="number"
                min="1"
                value={formData.team_size || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, team_size: parseInt(e.target.value) || undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="funding_goal">Funding Goal ($)</Label>
              <Input
                id="funding_goal"
                type="number"
                min="0"
                value={formData.funding_goal || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, funding_goal: parseInt(e.target.value) || undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="funding_raised">Funding Raised ($)</Label>
              <Input
                id="funding_raised"
                type="number"
                min="0"
                value={formData.funding_raised || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, funding_raised: parseInt(e.target.value) || undefined }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Founders</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add founder name"
                  value={founderInput}
                  onChange={(e) => setFounderInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFounder())}
                />
                <Button type="button" onClick={addFounder} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.founder_names && formData.founder_names.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.founder_names.map((founder, index) => (
                    <div key={index} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded">
                      <span className="text-sm">{founder}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFounder(index)}
                        className="h-4 w-4 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'edit' ? 'Update Startup' : 'Add Startup'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}