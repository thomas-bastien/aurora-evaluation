import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommunityManager {
  name: string;
  email: string;
  job_title?: string;
  organization?: string;
  linkedin_url?: string;
  can_manage_startups?: boolean;
  can_manage_jurors?: boolean;
  can_invite_cms?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

interface CMDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftData: Partial<CommunityManager>[];
  onImportComplete: () => void;
}

export function CMDraftModal({ open, onOpenChange, draftData, onImportComplete }: CMDraftModalProps) {
  const [editableData, setEditableData] = useState<Partial<CommunityManager>[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, ValidationError[]>>({});
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditableData([...draftData]);
    validateAllEntries([...draftData]);
  }, [draftData]);

  const validateEntry = (entry: Partial<CommunityManager>): ValidationError[] => {
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

  const validateAllEntries = (data: Partial<CommunityManager>[]) => {
    const allErrors: Record<number, ValidationError[]> = {};
    data.forEach((entry, index) => {
      const errors = validateEntry(entry);
      if (errors.length > 0) {
        allErrors[index] = errors;
      }
    });
    setValidationErrors(allErrors);
  };

  const updateEntry = (index: number, field: keyof CommunityManager, value: string) => {
    const newData = [...editableData];
    newData[index] = { ...newData[index], [field]: value };
    setEditableData(newData);
    
    const errors = validateEntry(newData[index]);
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
      const validData = editableData.filter(entry => entry.name?.trim() && entry.email?.trim()).map(entry => ({
        name: entry.name!.trim(),
        email: entry.email!.trim(),
        job_title: entry.job_title?.trim() || null,
        organization: entry.organization?.trim() || null,
        linkedin_url: entry.linkedin_url?.trim() || null,
        permissions: {
          can_manage_startups: entry.can_manage_startups !== false,
          can_manage_jurors: entry.can_manage_jurors !== false,
          can_invite_cms: entry.can_invite_cms === true
        }
      }));

      const { error } = await supabase
        .from('community_managers')
        .insert(validData);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `${validData.length} community manager(s) imported.`,
      });

      onImportComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Import error:', error);
      
      toast({
        title: "Import failed",
        description: error.message || "There was an error importing the community managers.",
        variant: "destructive",
      });
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
          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {Object.keys(validationErrors).length} entries have errors. Please fix them before importing.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {editableData.map((entry, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  validationErrors[index] ? 'border-destructive bg-destructive/5' : 'border-border'
                }`}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={entry.name || ''}
                      onChange={(e) => updateEntry(index, 'name', e.target.value)}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      value={entry.email || ''}
                      onChange={(e) => updateEntry(index, 'email', e.target.value)}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Job Title</label>
                    <Input
                      value={entry.job_title || ''}
                      onChange={(e) => updateEntry(index, 'job_title', e.target.value)}
                      placeholder="Enter job title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Organization</label>
                    <Input
                      value={entry.organization || ''}
                      onChange={(e) => updateEntry(index, 'organization', e.target.value)}
                      placeholder="Enter organization"
                    />
                  </div>
                </div>

                {validationErrors[index] && (
                  <div className="mt-2">
                    {validationErrors[index].map((error, errIndex) => (
                      <p key={errIndex} className="text-sm text-destructive">
                        {error.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {validEntries} of {totalEntries} entries valid
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={hasErrors || isImporting}>
                {isImporting ? 'Importing...' : `Import ${validEntries} CM${validEntries !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
