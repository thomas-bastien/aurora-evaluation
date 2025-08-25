import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Juror {
  name: string;
  email: string;
  job_title?: string;
  company?: string;
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

      const { error } = await supabase
        .from('jurors')
        .insert(validData);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `${validData.length} jurors have been imported.`,
      });

      onImportComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Import error:', error);
      
      // Check if it's a duplicate email constraint violation
      if (error?.code === '23505' && error?.message?.includes('jurors_email_key')) {
        toast({
          title: "Duplicate email found",
          description: "One or more jurors with these email addresses already exist in the system.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import failed",
          description: "There was an error importing the jurors. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}