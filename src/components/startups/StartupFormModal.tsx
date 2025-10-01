import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { normalizeStage } from '@/utils/stageUtils';
import { AURORA_VERTICALS, BUSINESS_MODELS, CURRENCIES, REGION_OPTIONS } from '@/constants/startupConstants';
import { STAGE_OPTIONS } from '@/constants/jurorPreferences';
import { useUserProfile } from '@/hooks/useUserProfile';

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
  linkedin_url?: string;
  total_investment_received?: number;
  investment_currency?: string;
  business_model?: string;
  verticals?: string[];
  other_vertical_description?: string;
  regions?: string[];
  internal_score?: number;
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
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';
  
  const [formData, setFormData] = useState<Partial<Startup>>(
    initialData || {
      founder_names: [],
      status: 'pending',
      verticals: [],
      regions: [],
      investment_currency: 'GBP'
    }
  );

  const [founderInput, setFounderInput] = useState('');

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData(initialData);
    } else if (mode === 'create') {
      setFormData({
        founder_names: [],
        status: 'pending',
        verticals: [],
        regions: [],
        investment_currency: 'GBP'
      });
    }
  }, [initialData, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedData = {
      ...formData,
      stage: normalizeStage(formData.stage)
    };
    onSubmit(normalizedData);
    if (mode === 'create') {
      setFormData({ founder_names: [], status: 'pending', verticals: [], regions: [], investment_currency: 'GBP' });
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

  const toggleVertical = (vertical: string) => {
    setFormData(prev => {
      const currentVerticals = prev.verticals || [];
      const isSelected = currentVerticals.includes(vertical);
      
      if (isSelected) {
        // Remove vertical
        return {
          ...prev,
          verticals: currentVerticals.filter(v => v !== vertical),
          // Clear other vertical description if "Others (Specify)" is deselected
          other_vertical_description: vertical === 'Others (Specify)' ? '' : prev.other_vertical_description
        };
      } else {
        // Add vertical only if not already present (prevent duplicates)
        if (currentVerticals.includes(vertical)) {
          return prev; // No change if duplicate
        }
        return {
          ...prev,
          verticals: [...currentVerticals, vertical]
        };
      }
    });
  };

  const toggleRegion = (region: string) => {
    setFormData(prev => {
      const currentRegions = prev.regions || [];
      const isSelected = currentRegions.includes(region);
      
      if (isSelected) {
        return {
          ...prev,
          regions: currentRegions.filter(r => r !== region)
        };
      } else {
        // Add region only if not already present (prevent duplicates)
        if (currentRegions.includes(region)) {
          return prev; // No change if duplicate
        }
        return {
          ...prev,
          regions: [...currentRegions, region]
        };
      }
    });
  };

  const validateLinkedInUrl = (url: string) => {
    if (!url) return true;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce', 'SaaS', 'AI/ML', 'Biotech', 'CleanTech', 'Other'];
  // Use aligned stage options for consistency with juror preferences
  const stages = STAGE_OPTIONS.map(stage => stage === 'Pre-seed' ? 'Pre-Seed' : stage);
  const statuses = ['pending', 'under_review', 'selected', 'rejected'];

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit Startup' : 'Add New Startup'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label htmlFor="business_model">
                Business Model *
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="inline w-3 h-3 ml-1 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select the primary business model for this startup</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={formData.business_model || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, business_model: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business model" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_MODELS.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
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

          {/* Aurora Verticals */}
          <div>
            <Label>
              Verticals *
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="inline w-3 h-3 ml-1 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Use Aurora's official vertical taxonomy to ensure consistent reporting</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-60 overflow-y-auto">
              {AURORA_VERTICALS.map(vertical => (
                <div key={vertical} className="flex items-center space-x-2">
                  <Checkbox
                    id={`vertical-${vertical}`}
                    checked={(formData.verticals || []).includes(vertical)}
                    onCheckedChange={() => toggleVertical(vertical)}
                  />
                  <Label
                    htmlFor={`vertical-${vertical}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {vertical}
                  </Label>
                </div>
              ))}
            </div>
            {(formData.verticals || []).includes('Others (Specify)') && (
              <div className="mt-2">
                <Label htmlFor="other_vertical">Specify other vertical *</Label>
                <Input
                  id="other_vertical"
                  value={formData.other_vertical_description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_vertical_description: e.target.value }))}
                  placeholder="Please specify the vertical"
                  required
                />
              </div>
            )}
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
                      {stage}
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
                placeholder="Specific address or city"
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

          {/* Regions for Matchmaking */}
          <div>
            <Label>
              Target Regions *
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="inline w-3 h-3 ml-1 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select regions for investor matchmaking (separate from specific location above)</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-40 overflow-y-auto">
              {REGION_OPTIONS.map(region => (
                <div key={region} className="flex items-center space-x-2">
                  <Checkbox
                    id={`region-${region}`}
                    checked={(formData.regions || []).includes(region)}
                    onCheckedChange={() => toggleRegion(region)}
                  />
                  <Label
                    htmlFor={`region-${region}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {region}
                  </Label>
                </div>
              ))}
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

          {/* Total Investment Received */}
          <div>
            <Label htmlFor="total_investment">Total Investment Received</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="total_investment"
                  type="number"
                  min="0"
                  value={formData.total_investment_received || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    total_investment_received: parseInt(e.target.value) || undefined 
                  }))}
                  placeholder="Investment amount"
                />
              </div>
              <div className="w-32">
                <Select
                  value={formData.investment_currency || 'GBP'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, investment_currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

          {/* Internal Score (Admin Only) */}
          {isAdmin && (
            <div>
              <Label htmlFor="internal_score">
                Internal Score (Admin Only)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="inline w-3 h-3 ml-1 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Aurora internal evaluation score (0-10 scale). Hidden from VCs.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="internal_score"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.internal_score || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  setFormData(prev => ({ ...prev, internal_score: value }));
                }}
                placeholder="0.0 - 10.0"
              />
            </div>
          )}

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
    </TooltipProvider>
  );
}