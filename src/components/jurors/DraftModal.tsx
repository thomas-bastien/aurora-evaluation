import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Juror {
  id?: string;
  name: string;
  email: string;
  job_title?: string;
  company?: string;
}

interface DuplicateMatch {
  existing: Juror;
  incoming: Juror;
}

interface InternalDuplicate {
  email: string;
  entries: Juror[];
}

interface ValidationError {
  field: string;
  message: string;
}

interface DraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftData: Partial<Juror>[];
  onImportComplete: () => void;
}

export function DraftModal({ open, onOpenChange, draftData, onImportComplete }: DraftModalProps) {
  const [editableData, setEditableData] = useState<Partial<Juror>[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, ValidationError[]>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [showDuplicateReview, setShowDuplicateReview] = useState(false);
  const [duplicateResolution, setDuplicateResolution] = useState<'skip' | 'update' | null>(null);
  const [internalDuplicates, setInternalDuplicates] = useState<InternalDuplicate[]>([]);
  const [showInternalDuplicateReview, setShowInternalDuplicateReview] = useState(false);
  const [internalDuplicateResolution, setInternalDuplicateResolution] = useState<'first' | 'last' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setEditableData([...draftData]);
    validateAllEntries([...draftData]);
  }, [draftData]);

  const validateEntry = (entry: Partial<Juror>, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!entry.name?.trim()) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!entry.email?.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    return errors;
  };

  const validateAllEntries = (data: Partial<Juror>[]) => {
    const allErrors: Record<number, ValidationError[]> = {};
    data.forEach((entry, index) => {
      const errors = validateEntry(entry, index);
      if (errors.length > 0) {
        allErrors[index] = errors;
      }
    });
    setValidationErrors(allErrors);
  };

  const updateEntry = (index: number, field: keyof Juror, value: string) => {
    const newData = [...editableData];
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

  const detectInternalDuplicates = (data: Juror[]): { uniqueJurors: Juror[], internalDuplicates: InternalDuplicate[] } => {
    const emailMap = new Map<string, Juror[]>();
    
    data.forEach(juror => {
      const email = juror.email.toLowerCase();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email)!.push(juror);
    });
    
    const internalDuplicates: InternalDuplicate[] = [];
    const uniqueJurors: Juror[] = [];
    
    emailMap.forEach((entries, email) => {
      if (entries.length > 1) {
        internalDuplicates.push({ email, entries });
      } else {
        uniqueJurors.push(entries[0]);
      }
    });
    
    return { uniqueJurors, internalDuplicates };
  };

  const detectDuplicates = async (validData: Juror[]) => {
    const emails = validData.map(j => j.email);
    const { data: existingJurors, error } = await supabase
      .from('jurors')
      .select('id, name, email, job_title, company')
      .in('email', emails);

    if (error) throw error;

    const existingEmails = new Set(existingJurors?.map(j => j.email.toLowerCase()) || []);
    const newJurors = validData.filter(j => !existingEmails.has(j.email.toLowerCase()));
    const duplicateMatches: DuplicateMatch[] = [];

    validData.forEach(incoming => {
      const existing = existingJurors?.find(e => e.email.toLowerCase() === incoming.email.toLowerCase());
      if (existing) {
        duplicateMatches.push({ existing, incoming });
      }
    });

    return { newJurors, duplicateMatches };
  };

  const handleImport = async () => {
    if (hasErrors) return;

    setIsImporting(true);
    try {
      // Filter out entries without required fields and ensure proper data
      const validData = editableData.filter(entry => entry.name?.trim() && entry.email?.trim()).map(entry => ({
        name: entry.name!.trim(),
        email: entry.email!.trim(),
        job_title: entry.job_title?.trim() || null,
        company: entry.company?.trim() || null
      }));

      // Step 1: Check for internal duplicates first
      const { uniqueJurors, internalDuplicates: internalDups } = detectInternalDuplicates(validData);
      
      // If internal duplicates found and user hasn't decided yet, show review UI
      if (internalDups.length > 0 && !internalDuplicateResolution) {
        setInternalDuplicates(internalDups);
        setShowInternalDuplicateReview(true);
        setIsImporting(false);
        return;
      }

      // Resolve internal duplicates based on user choice
      let resolvedData = validData;
      if (internalDups.length > 0 && internalDuplicateResolution) {
        resolvedData = uniqueJurors.map(j => ({
          name: j.name,
          email: j.email,
          job_title: j.job_title || null,
          company: j.company || null
        }));
        internalDups.forEach(dup => {
          const selected = internalDuplicateResolution === 'first' 
            ? dup.entries[0] 
            : dup.entries[dup.entries.length - 1];
          resolvedData.push({
            name: selected.name,
            email: selected.email,
            job_title: selected.job_title || null,
            company: selected.company || null
          });
        });
      }

      // Step 2: Detect database duplicates
      const { newJurors, duplicateMatches } = await detectDuplicates(resolvedData);

      // If duplicates found and user hasn't decided yet, show review UI
      if (duplicateMatches.length > 0 && !duplicateResolution) {
        setDuplicates(duplicateMatches);
        setShowDuplicateReview(true);
        setIsImporting(false);
        return;
      }

      // Process based on resolution
      let importedCount = 0;
      let updatedCount = 0;

      // Insert new jurors
      if (newJurors.length > 0) {
        const { error } = await supabase
          .from('jurors')
          .insert(newJurors);

        if (error) throw error;
        importedCount = newJurors.length;
      }

      // Update duplicates if user chose to update
      if (duplicateResolution === 'update' && duplicates.length > 0) {
        for (const dup of duplicates) {
          const { error } = await supabase
            .from('jurors')
            .update({
              name: dup.incoming.name,
              job_title: dup.incoming.job_title,
              company: dup.incoming.company
            })
            .eq('email', dup.incoming.email);

          if (error) throw error;
          updatedCount++;
        }
      }

      // Show success message
      const messages = [];
      if (importedCount > 0) messages.push(`${importedCount} new juror${importedCount > 1 ? 's' : ''} imported`);
      if (updatedCount > 0) messages.push(`${updatedCount} existing juror${updatedCount > 1 ? 's' : ''} updated`);
      if (duplicateResolution === 'skip' && duplicates.length > 0) {
        messages.push(`${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''} skipped`);
      }

      toast({
        title: "Import successful",
        description: messages.join(', ') + '.',
      });

      onImportComplete();
      onOpenChange(false);
      
      // Reset state
      setDuplicates([]);
      setShowDuplicateReview(false);
      setDuplicateResolution(null);
      setInternalDuplicates([]);
      setShowInternalDuplicateReview(false);
      setInternalDuplicateResolution(null);
    } catch (error: any) {
      console.error('Import error:', error);
      
      toast({
        title: "Import failed",
        description: "There was an error importing the jurors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleProceedWithResolution = () => {
    if (!duplicateResolution) {
      toast({
        title: "Please select an option",
        description: "Choose how to handle duplicate emails before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (duplicateResolution === 'skip' || duplicateResolution === 'update') {
      handleImport();
    }
  };

  const handleCancelDuplicateReview = () => {
    setShowDuplicateReview(false);
    setDuplicates([]);
    setDuplicateResolution(null);
    setIsImporting(false);
  };

  const handleProceedWithInternalResolution = () => {
    if (!internalDuplicateResolution) {
      toast({
        title: "Please select an option",
        description: "Choose how to handle duplicate emails before proceeding.",
        variant: "destructive",
      });
      return;
    }

    // Continue with the import after internal duplicates are resolved
    setShowInternalDuplicateReview(false);
    handleImport();
  };

  const handleCancelInternalDuplicateReview = () => {
    setShowInternalDuplicateReview(false);
    setInternalDuplicates([]);
    setInternalDuplicateResolution(null);
    setIsImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showInternalDuplicateReview 
              ? 'Review Duplicate Emails in Upload' 
              : showDuplicateReview 
                ? 'Review Existing Emails' 
                : 'Review Draft Imports'}
          </DialogTitle>
        </DialogHeader>

        {showInternalDuplicateReview ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {internalDuplicates.length} email{internalDuplicates.length > 1 ? 's appear' : ' appears'} multiple times in your upload file.
                Each email can only be used once.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto">
              {internalDuplicates.map((dup, index) => (
                <div key={index} className="border rounded-lg p-4 bg-muted/50">
                  <div className="mb-3">
                    <p className="font-semibold text-sm">{dup.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Appears {dup.entries.length} times in the upload
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {dup.entries.map((entry, entryIndex) => (
                      <div key={entryIndex} className="text-sm bg-background p-2 rounded border">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Entry {entryIndex + 1}</span>
                          {entryIndex === 0 && (
                            <Badge variant="secondary" className="text-xs">First</Badge>
                          )}
                          {entryIndex === dup.entries.length - 1 && (
                            <Badge variant="secondary" className="text-xs">Last</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs space-y-0.5 text-muted-foreground">
                          <div>Name: {entry.name}</div>
                          <div>Job Title: {entry.job_title || '—'}</div>
                          <div>Company: {entry.company || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 bg-background">
              <h4 className="text-sm font-semibold mb-3">How would you like to proceed?</h4>
              <RadioGroup 
                value={internalDuplicateResolution || ''} 
                onValueChange={(value) => setInternalDuplicateResolution(value as 'first' | 'last')}
              >
                <div className="flex items-start space-x-2 mb-3">
                  <RadioGroupItem value="first" id="first" />
                  <Label htmlFor="first" className="cursor-pointer">
                    <div className="font-medium">Keep first occurrence</div>
                    <div className="text-sm text-muted-foreground">
                      For each duplicate email, use the first entry in the file
                    </div>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="last" id="last" />
                  <Label htmlFor="last" className="cursor-pointer">
                    <div className="font-medium">Keep last occurrence</div>
                    <div className="text-sm text-muted-foreground">
                      For each duplicate email, use the last entry in the file
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancelInternalDuplicateReview}>
                Cancel
              </Button>
              <Button 
                onClick={handleProceedWithInternalResolution}
                disabled={!internalDuplicateResolution || isImporting}
                className="min-w-24"
              >
                {isImporting ? 'Processing...' : 'Continue'}
              </Button>
            </div>
          </div>
        ) : showDuplicateReview ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {duplicates.length} duplicate email{duplicates.length > 1 ? 's' : ''} found. 
                The following emails already exist in the system.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto">
              {duplicates.map((dup, index) => {
                const hasChanges = 
                  dup.existing.name !== dup.incoming.name ||
                  dup.existing.job_title !== dup.incoming.job_title ||
                  dup.existing.company !== dup.incoming.company;

                return (
                  <div key={index} className="border rounded-lg p-4 bg-muted/50">
                    <div className="mb-3">
                      <p className="font-semibold text-sm text-muted-foreground">{dup.existing.email}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Existing in Database</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Name:</span>
                            <span>{dup.existing.name}</span>
                            {dup.existing.name === dup.incoming.name && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Job Title:</span>
                            <span>{dup.existing.job_title || '—'}</span>
                            {dup.existing.job_title === dup.incoming.job_title && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Company:</span>
                            <span>{dup.existing.company || '—'}</span>
                            {dup.existing.company === dup.incoming.company && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">In Your Upload</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Name:</span>
                            <span className={dup.existing.name !== dup.incoming.name ? 'font-semibold text-orange-600' : ''}>
                              {dup.incoming.name}
                            </span>
                            {dup.existing.name !== dup.incoming.name && (
                              <AlertTriangle className="h-3 w-3 text-orange-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Job Title:</span>
                            <span className={dup.existing.job_title !== dup.incoming.job_title ? 'font-semibold text-orange-600' : ''}>
                              {dup.incoming.job_title || '—'}
                            </span>
                            {dup.existing.job_title !== dup.incoming.job_title && (
                              <AlertTriangle className="h-3 w-3 text-orange-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Company:</span>
                            <span className={dup.existing.company !== dup.incoming.company ? 'font-semibold text-orange-600' : ''}>
                              {dup.incoming.company || '—'}
                            </span>
                            {dup.existing.company !== dup.incoming.company && (
                              <AlertTriangle className="h-3 w-3 text-orange-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {hasChanges && (
                      <div className="mt-2 text-xs text-orange-600">
                        ⚠️ Data differs from existing record
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border rounded-lg p-4 bg-background">
              <h4 className="text-sm font-semibold mb-3">How would you like to proceed?</h4>
              <RadioGroup value={duplicateResolution || ''} onValueChange={(value) => setDuplicateResolution(value as 'skip' | 'update')}>
                <div className="flex items-start space-x-2 mb-3">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="cursor-pointer">
                    <div className="font-medium">Skip duplicates</div>
                    <div className="text-sm text-muted-foreground">
                      Only import {validEntries - duplicates.length} new juror{validEntries - duplicates.length !== 1 ? 's' : ''}
                    </div>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="cursor-pointer">
                    <div className="font-medium">Update duplicates with new data</div>
                    <div className="text-sm text-muted-foreground">
                      Import {validEntries - duplicates.length} new juror{validEntries - duplicates.length !== 1 ? 's' : ''} and update {duplicates.length} existing record{duplicates.length !== 1 ? 's' : ''}
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancelDuplicateReview}>
                Cancel
              </Button>
              <Button 
                onClick={handleProceedWithResolution}
                disabled={!duplicateResolution || isImporting}
                className="min-w-24"
              >
                {isImporting ? 'Processing...' : 'Proceed'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {validEntries} of {totalEntries} entries are valid. 
              {hasErrors && ` Please fix ${Object.keys(validationErrors).length} entries with errors.`}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {editableData.map((entry, index) => {
              const entryErrors = validationErrors[index] || [];
              const hasEntryErrors = entryErrors.length > 0;

              return (
                <div key={index} className={`border rounded-lg p-4 ${hasEntryErrors ? 'border-destructive' : 'border-border'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">
                      {entry.name || `Juror ${index + 1}`}
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

                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="text-sm font-medium">Email *</label>
                      <Input
                        type="email"
                        value={entry.email || ''}
                        onChange={(e) => updateEntry(index, 'email', e.target.value)}
                        className={entryErrors.some(e => e.field === 'email') ? 'border-destructive' : ''}
                      />
                      {entryErrors.filter(e => e.field === 'email').map(error => (
                        <p key={error.field} className="text-xs text-destructive mt-1">{error.message}</p>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Job Title</label>
                      <Input
                        value={entry.job_title || ''}
                        onChange={(e) => updateEntry(index, 'job_title', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Company</label>
                      <Input
                        value={entry.company || ''}
                        onChange={(e) => updateEntry(index, 'company', e.target.value)}
                      />
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
                {isImporting ? 'Importing...' : `Import ${validEntries} Jurors`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}