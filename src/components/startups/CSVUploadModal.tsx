import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizeStage } from '@/utils/stageUtils';

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

interface CSVUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataParsed: (data: Partial<Startup>[]) => void;
}

export function CSVUploadModal({ open, onOpenChange, onDataParsed }: CSVUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const parseCSV = (csvText: string): Partial<Startup>[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Better CSV parsing that handles quoted fields with commas
    const parseCSVLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else if (char !== '"' || inQuotes) {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    const data: Partial<Startup>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const startup: Partial<Startup> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header) {
          case 'name':
            startup.name = value;
            break;
          case 'description':
            startup.description = value;
            break;
          case 'industry':
            startup.industry = value;
            break;
          case 'stage':
            startup.stage = normalizeStage(value);
            break;
          case 'location':
            startup.location = value;
            break;
          case 'founded_year':
            startup.founded_year = value ? parseInt(value) : undefined;
            break;
          case 'team_size':
            startup.team_size = value ? parseInt(value) : undefined;
            break;
          case 'funding_goal':
            startup.funding_goal = value ? parseInt(value) : undefined;
            break;
          case 'funding_raised':
            startup.funding_raised = value ? parseInt(value) : undefined;
            break;
          case 'website':
            startup.website = value;
            break;
          case 'contact_email':
            startup.contact_email = value;
            break;
          case 'contact_phone':
            startup.contact_phone = value;
            break;
          case 'founder_names':
            startup.founder_names = value ? value.split(';').map(n => n.trim()) : [];
            break;
          case 'status':
            startup.status = value || 'pending';
            break;
        }
      });

      if (startup.name) {
        data.push(startup);
      }
    }

    return data;
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      try {
        const parsedData = parseCSV(csvText);
        if (parsedData.length === 0) {
          toast({
            title: "No data found",
            description: "The CSV file appears to be empty or invalid.",
            variant: "destructive",
          });
          return;
        }
        onDataParsed(parsedData);
        onOpenChange(false);
        toast({
          title: "CSV uploaded successfully",
          description: `${parsedData.length} startups loaded for review.`,
        });
      } catch (error) {
        toast({
          title: "Error parsing CSV",
          description: "Please check the file format and try again.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload CSV File</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your CSV file here, or click to select
            </p>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Make sure your CSV includes headers that match the startup schema. 
            Use semicolons (;) to separate multiple founder names.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}