import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeStage } from '@/utils/stageUtils';

interface Startup {
  name: string;
  description?: string;
  industry?: string;
  stage?: string;
  location?: string;
  founded_year?: number;
  team_size?: number;
  funding_goal?: number;
  funding_raised?: number;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  founder_names?: string[];
  status?: string;
  founder_first_name?: string;
  founder_last_name?: string;
  founder_linkedin?: string;
  serviceable_obtainable_market?: string;
  full_time_team_members?: number;
  paying_customers_per_year?: string;
  countries_operating?: string;
  countries_expansion_plan?: string;
  business_risks_mitigation?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface DraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftData: Partial<Startup>[];
  onImportComplete: () => void;
}

export function DraftModal({ open, onOpenChange, draftData, onImportComplete }: DraftModalProps) {
  const [editableData, setEditableData] = useState<Partial<Startup>[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, ValidationError[]>>({});
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditableData([...draftData]);
    validateAllEntries([...draftData]);
  }, [draftData]);

  const validateEntry = (entry: Partial<Startup>, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!entry.name?.trim()) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (entry.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.contact_email)) {
      errors.push({ field: 'contact_email', message: 'Invalid email format' });
    }

    if (entry.website && !entry.website.startsWith('http')) {
      errors.push({ field: 'website', message: 'Website must start with http:// or https://' });
    }

    if (entry.founded_year && (entry.founded_year < 1900 || entry.founded_year > new Date().getFullYear())) {
      errors.push({ field: 'founded_year', message: 'Invalid founded year' });
    }

    if (entry.team_size && entry.team_size < 1) {
      errors.push({ field: 'team_size', message: 'Team size must be at least 1' });
    }

    return errors;
  };

  const validateAllEntries = (data: Partial<Startup>[]) => {
    const allErrors: Record<number, ValidationError[]> = {};
    data.forEach((entry, index) => {
      const errors = validateEntry(entry, index);
      if (errors.length > 0) {
        allErrors[index] = errors;
      }
    });
    setValidationErrors(allErrors);
  };

  const updateEntry = (index: number, field: keyof Startup, value: any) => {
    const newData = [...editableData];
    // Normalize stage values
    if (field === 'stage') {
      value = normalizeStage(value);
    }
    newData[index] = { ...newData[index], [field]: value };
    setEditableData(newData);
    
    // Re-validate this entry
    const errors = validateEntry(newData[index], index);
    const newErrors = { ...validationErrors };
    if (errors.length > 0) {
      newErrors[index] = errors;
    } else {
      delete newErrors[index];
    }
    setValidationErrors(newErrors);
  };

  const hasErrors = Object.keys(validationErrors).length > 0;
  const totalEntries = editableData.length;
  const validEntries = totalEntries - Object.keys(validationErrors).length;

  const handleImport = async () => {
    if (hasErrors) return;

    setIsImporting(true);
    try {
      // Filter out entries without names and ensure required fields
      const validData = editableData.filter(entry => entry.name?.trim()).map(entry => ({
        ...entry,
        name: entry.name!,
        status: entry.status || 'pending'
      }));

      const { error } = await supabase
        .from('startups')
        .insert(validData);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `${editableData.length} startups have been imported.`,
      });

      onImportComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "There was an error importing the startups. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce', 'SaaS', 'AI/ML', 'Biotech', 'CleanTech', 'Other'];
  const stages = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'IPO'];
  const statuses = ['pending', 'under_review', 'selected', 'rejected'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Draft Imports</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {validEntries} of {totalEntries} entries are valid. 
              {hasErrors && ` Please fix ${Object.keys(validationErrors).length} entries with errors.`}
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            {editableData.map((entry, index) => {
              const entryErrors = validationErrors[index] || [];
              const hasEntryErrors = entryErrors.length > 0;

              return (
                <div key={index} className={`border rounded-lg p-4 ${hasEntryErrors ? 'border-destructive' : 'border-border'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">
                      {entry.name || `Startup ${index + 1}`}
                    </h3>
                    {hasEntryErrors ? (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {entryErrors.length} error{entryErrors.length > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        value={entry.name || ''}
                        onChange={(e) => updateEntry(index, 'name', e.target.value)}
                        className={entryErrors.some(e => e.field === 'name') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'name').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Industry</label>
                      <Select
                        value={entry.industry || ''}
                        onValueChange={(value) => updateEntry(index, 'industry', value)}
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

                    <div>
                      <label className="text-sm font-medium">Stage</label>
                      <Select
                        value={entry.stage || ''}
                        onValueChange={(value) => updateEntry(index, 'stage', value)}
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

                    <div className="col-span-3">
                      <label className="text-sm font-medium">Description (Value Proposition)</label>
                      <Textarea
                        value={entry.description || ''}
                        onChange={(e) => updateEntry(index, 'description', e.target.value)}
                        rows={2}
                        placeholder="Startup's value proposition and pitch"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Founder First Name</label>
                      <Input
                        value={entry.founder_first_name || ''}
                        onChange={(e) => updateEntry(index, 'founder_first_name', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Founder Last Name</label>
                      <Input
                        value={entry.founder_last_name || ''}
                        onChange={(e) => updateEntry(index, 'founder_last_name', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Founder LinkedIn</label>
                      <Input
                        value={entry.founder_linkedin || ''}
                        onChange={(e) => updateEntry(index, 'founder_linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        value={entry.location || ''}
                        onChange={(e) => updateEntry(index, 'location', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Contact Email</label>
                      <Input
                        type="email"
                        value={entry.contact_email || ''}
                        onChange={(e) => updateEntry(index, 'contact_email', e.target.value)}
                        className={entryErrors.some(e => e.field === 'contact_email') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'contact_email').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Serviceable Market</label>
                      <Input
                        value={entry.serviceable_obtainable_market || ''}
                        onChange={(e) => updateEntry(index, 'serviceable_obtainable_market', e.target.value)}
                        placeholder="e.g., $10M-$100M"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Team Size</label>
                      <Input
                        type="number"
                        value={entry.team_size || ''}
                        onChange={(e) => updateEntry(index, 'team_size', parseInt(e.target.value) || undefined)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Full-Time Members</label>
                      <Input
                        type="number"
                        value={entry.full_time_team_members || ''}
                        onChange={(e) => updateEntry(index, 'full_time_team_members', parseInt(e.target.value) || undefined)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Paying Customers/Year</label>
                      <Input
                        value={entry.paying_customers_per_year || ''}
                        onChange={(e) => updateEntry(index, 'paying_customers_per_year', e.target.value)}
                        placeholder="e.g., 100-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Countries Operating</label>
                      <Input
                        value={entry.countries_operating || ''}
                        onChange={(e) => updateEntry(index, 'countries_operating', e.target.value)}
                        placeholder="e.g., UK, US, Germany"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Expansion Plans</label>
                      <Input
                        value={entry.countries_expansion_plan || ''}
                        onChange={(e) => updateEntry(index, 'countries_expansion_plan', e.target.value)}
                        placeholder="Future expansion countries"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="text-sm font-medium">Business Risks & Mitigation</label>
                      <Textarea
                        value={entry.business_risks_mitigation || ''}
                        onChange={(e) => updateEntry(index, 'business_risks_mitigation', e.target.value)}
                        rows={2}
                        placeholder="Key risks and mitigation strategies"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={entry.status || 'pending'}
                        onValueChange={(value) => updateEntry(index, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={hasErrors || isImporting}
              className="min-w-24"
            >
              {isImporting ? 'Importing...' : `Import ${validEntries} Startups`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}