import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Sparkles, Check, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeStage } from '@/utils/stageUtils';
import { VERTICAL_OPTIONS, STAGE_OPTIONS, REGION_OPTIONS } from '@/constants/jurorPreferences';
import { BUSINESS_MODELS } from '@/constants/startupConstants';

interface AISuggestion {
  field: string;
  original: any;
  suggested: any;
  confidence: number;
  reason: string;
}

interface Startup {
  name: string;
  description?: string;
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
  linkedin_url?: string;
  pitch_deck_url?: string;
  demo_url?: string;
  business_model?: string[];
  internal_score?: number;
  region?: string;
  regions?: string[];
  verticals?: string[];
  investment_currency?: string;
  _aiSuggestions?: AISuggestion[];
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
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
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

    if (entry.linkedin_url && !entry.linkedin_url.startsWith('http')) {
      errors.push({ field: 'linkedin_url', message: 'LinkedIn URL must start with http:// or https://' });
    }

    if (entry.pitch_deck_url && !entry.pitch_deck_url.startsWith('http')) {
      errors.push({ field: 'pitch_deck_url', message: 'Pitch deck URL must start with http:// or https://' });
    }

    if (entry.founded_year && (entry.founded_year < 1900 || entry.founded_year > new Date().getFullYear())) {
      errors.push({ field: 'founded_year', message: 'Invalid founded year' });
    }

    if (entry.team_size && entry.team_size < 1) {
      errors.push({ field: 'team_size', message: 'Team size must be at least 1' });
    }

    if (entry.internal_score && (entry.internal_score < 0 || entry.internal_score > 10)) {
      errors.push({ field: 'internal_score', message: 'Internal score must be between 0 and 10' });
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

  const totalSuggestions = editableData.reduce((sum, entry) => 
    sum + (entry._aiSuggestions?.length || 0), 0
  );
  const activeSuggestions = editableData.reduce((sum, entry, idx) => {
    const suggestions = entry._aiSuggestions || [];
    return sum + suggestions.filter(s => 
      !rejectedSuggestions.has(`${idx}-${s.field}`)
    ).length;
  }, 0);

  const acceptSuggestion = (entryIndex: number, suggestion: AISuggestion) => {
    const newData = [...editableData];
    newData[entryIndex] = { 
      ...newData[entryIndex], 
      [suggestion.field]: suggestion.suggested 
    };
    setEditableData(newData);
    validateAllEntries(newData);
    
    toast({
      title: "Suggestion applied",
      description: `${suggestion.field} updated`,
    });
  };

  const rejectSuggestion = (entryIndex: number, suggestion: AISuggestion) => {
    const key = `${entryIndex}-${suggestion.field}`;
    setRejectedSuggestions(prev => new Set([...prev, key]));
  };

  const acceptAllSuggestions = () => {
    const newData = editableData.map((entry, idx) => {
      const suggestions = entry._aiSuggestions || [];
      const updates: any = {};
      
      suggestions.forEach(s => {
        const key = `${idx}-${s.field}`;
        if (!rejectedSuggestions.has(key)) {
          updates[s.field] = s.suggested;
        }
      });
      
      return { ...entry, ...updates };
    });
    
    setEditableData(newData);
    validateAllEntries(newData);
    
    toast({
      title: "All suggestions applied",
      description: `${activeSuggestions} AI suggestions accepted`,
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <Badge variant="default" className="bg-green-500">High Confidence</Badge>;
    } else if (confidence >= 0.7) {
      return <Badge variant="secondary" className="bg-yellow-500 text-black">Medium Confidence</Badge>;
    } else {
      return <Badge variant="outline" className="border-red-500 text-red-500">Low Confidence</Badge>;
    }
  };

  const handleImport = async () => {
    if (hasErrors) return;

    setIsImporting(true);
    try {
      // Filter out entries without names and ensure required fields, remove AI metadata
      const validData = editableData.filter(entry => entry.name?.trim()).map(entry => {
        const { _aiSuggestions, ...cleanEntry } = entry;
        return {
          ...cleanEntry,
          name: cleanEntry.name!,
          status: cleanEntry.status || 'pending'
        };
      });

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
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error?.message || "There was an error importing the startups. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const currencies = ['GBP', 'USD', 'EUR'];
  const statuses = ['pending', 'under_review', 'selected', 'rejected'];

  const toggleVertical = (index: number, vertical: string) => {
    const newData = [...editableData];
    const currentVerticals = newData[index].verticals || [];
    const isSelected = currentVerticals.includes(vertical);
    
    if (isSelected) {
      newData[index].verticals = currentVerticals.filter(v => v !== vertical);
    } else {
      newData[index].verticals = [...currentVerticals, vertical];
    }
    setEditableData(newData);
    validateAllEntries(newData);
  };

  const toggleBusinessModel = (index: number, model: string) => {
    const newData = [...editableData];
    const currentModels = newData[index].business_model || [];
    const isSelected = currentModels.includes(model);
    
    if (isSelected) {
      newData[index].business_model = currentModels.filter(m => m !== model);
    } else {
      newData[index].business_model = [...currentModels, model];
    }
    setEditableData(newData);
    validateAllEntries(newData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Draft Imports</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {totalSuggestions > 0 && (
            <Alert className="bg-primary/5 border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  ✨ {activeSuggestions} AI suggestions available to improve data quality
                </span>
                {activeSuggestions > 0 && (
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={acceptAllSuggestions}
                  >
                    Accept All Suggestions
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

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
              const aiSuggestions = (entry._aiSuggestions || []).filter(s => 
                !rejectedSuggestions.has(`${index}-${s.field}`)
              );

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
                    {aiSuggestions.length > 0 && (
                      <Badge variant="outline" className="border-primary text-primary">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {aiSuggestions.length} AI suggestion{aiSuggestions.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {aiSuggestions.length > 0 && (
                    <div className="mb-4 space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Suggestions for this entry:
                      </p>
                      {aiSuggestions.map((suggestion, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2 text-sm bg-background p-2 rounded">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{suggestion.field}:</span>
                              {getConfidenceBadge(suggestion.confidence)}
                            </div>
                            <div className="text-muted-foreground text-xs space-y-1">
                              <div>Original: <span className="line-through">{JSON.stringify(suggestion.original)}</span></div>
                              <div>Suggested: <span className="text-primary font-medium">{JSON.stringify(suggestion.suggested)}</span></div>
                              <div>Reason: {suggestion.reason}</div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => acceptSuggestion(index, suggestion)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => rejectSuggestion(index, suggestion)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Company Name *</label>
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
                      <label className="text-sm font-medium">Stage</label>
                      <Select
                        value={entry.stage || ''}
                        onValueChange={(value) => updateEntry(index, 'stage', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGE_OPTIONS.map(stage => (
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
                      <label className="text-sm font-medium">First Name</label>
                      <Input
                        value={entry.founder_first_name || ''}
                        onChange={(e) => updateEntry(index, 'founder_first_name', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Last Name</label>
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
                      <label className="text-sm font-medium">Website</label>
                      <Input
                        value={entry.website || ''}
                        onChange={(e) => updateEntry(index, 'website', e.target.value)}
                        placeholder="https://..."
                        className={entryErrors.some(e => e.field === 'website') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'website').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Company LinkedIn</label>
                      <Input
                        value={entry.linkedin_url || ''}
                        onChange={(e) => updateEntry(index, 'linkedin_url', e.target.value)}
                        placeholder="https://linkedin.com/company/..."
                        className={entryErrors.some(e => e.field === 'linkedin_url') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'linkedin_url').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Contact Phone</label>
                      <Input
                        value={entry.contact_phone || ''}
                        onChange={(e) => updateEntry(index, 'contact_phone', e.target.value)}
                        placeholder="+44..."
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
                      <label className="text-sm font-medium">Region</label>
                      <Select
                        value={entry.region || ''}
                        onValueChange={(value) => updateEntry(index, 'region', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose region" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGION_OPTIONS.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Founded Year</label>
                      <Input
                        type="number"
                        value={entry.founded_year || ''}
                        onChange={(e) => updateEntry(index, 'founded_year', parseInt(e.target.value) || undefined)}
                        placeholder="2020"
                        className={entryErrors.some(e => e.field === 'founded_year') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'founded_year').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
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

                    <div className="col-span-3">
                      <label className="text-sm font-medium">Verticals</label>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2">
                          {VERTICAL_OPTIONS.map(vertical => (
                            <div key={vertical} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${index}-vertical-${vertical}`}
                                checked={(entry.verticals || []).includes(vertical)}
                                onCheckedChange={() => toggleVertical(index, vertical)}
                              />
                              <Label
                                htmlFor={`${index}-vertical-${vertical}`}
                                className="text-xs font-normal cursor-pointer"
                              >
                                {vertical}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Pitch Deck URL</label>
                      <Input
                        value={entry.pitch_deck_url || ''}
                        onChange={(e) => updateEntry(index, 'pitch_deck_url', e.target.value)}
                        placeholder="https://..."
                        className={entryErrors.some(e => e.field === 'pitch_deck_url') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'pitch_deck_url').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Demo URL</label>
                      <Input
                        value={entry.demo_url || ''}
                        onChange={(e) => updateEntry(index, 'demo_url', e.target.value)}
                        placeholder="https://..."
                      />
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
                      <label className="text-sm font-medium">Target Countries for Expansion</label>
                      <Input
                        value={entry.countries_expansion_plan || ''}
                        onChange={(e) => updateEntry(index, 'countries_expansion_plan', e.target.value)}
                        placeholder="e.g., France, Spain, Italy"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="text-sm font-medium">Business Model</label>
                      <div className="border rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-2">
                          {BUSINESS_MODELS.map(model => (
                            <div key={model} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${index}-model-${model}`}
                                checked={(entry.business_model || []).includes(model)}
                                onCheckedChange={() => toggleBusinessModel(index, model)}
                              />
                              <Label
                                htmlFor={`${index}-model-${model}`}
                                className="text-xs font-normal cursor-pointer"
                              >
                                {model}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Funding Goal (Raising)</label>
                      <Input
                        type="number"
                        value={entry.funding_goal || ''}
                        onChange={(e) => updateEntry(index, 'funding_goal', parseInt(e.target.value) || undefined)}
                        placeholder="Amount in currency"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Funding Raised</label>
                      <Input
                        type="number"
                        value={entry.funding_raised || ''}
                        onChange={(e) => updateEntry(index, 'funding_raised', parseInt(e.target.value) || undefined)}
                        placeholder="Amount already raised"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Currency</label>
                      <Select
                        value={entry.investment_currency || 'GBP'}
                        onValueChange={(value) => updateEntry(index, 'investment_currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map(currency => (
                            <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Internal Score (0-100)</label>
                      <Input
                        type="number"
                        value={entry.internal_score || ''}
                        onChange={(e) => updateEntry(index, 'internal_score', parseInt(e.target.value) || undefined)}
                        placeholder="0-100"
                        className={entryErrors.some(e => e.field === 'internal_score') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'internal_score').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
                    </div>

                    <div className="col-span-2">
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
                              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
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