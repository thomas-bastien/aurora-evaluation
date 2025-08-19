import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Juror {
  name: string;
  email: string;
  job_title?: string;
  company?: string;
}

interface CSVUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataParsed: (data: Partial<Juror>[]) => void;
}

export function CSVUploadModal({ open, onOpenChange, onDataParsed }: CSVUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const parseCSV = (csvText: string): Partial<Juror>[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Partial<Juror>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const juror: Partial<Juror> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'name':
            juror.name = value;
            break;
          case 'email':
            juror.email = value;
            break;
          case 'job_title':
          case 'job title':
            juror.job_title = value;
            break;
          case 'company':
            juror.company = value;
            break;
        }
      });

      if (juror.name && juror.email) {
        data.push(juror);
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
          description: `${parsedData.length} jurors loaded for review.`,
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
            <Label htmlFor="juror-file-upload">
              <Button variant="outline" className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </Label>
            <Input
              id="juror-file-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            Make sure your CSV includes headers: name, email, job_title (optional), company (optional).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}