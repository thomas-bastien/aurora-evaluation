import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

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
    const data: Partial<Juror>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const juror: Partial<Juror> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header) {
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

  const parseExcel = (file: File): Promise<Partial<Juror>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);
          
          const parsed: Partial<Juror>[] = jsonData.map((row: any) => {
            const juror: Partial<Juror> = {};
            
            // Handle different possible column names
            juror.name = row.name || row.Name || row.NAME || '';
            juror.email = row.email || row.Email || row.EMAIL || '';
            juror.job_title = row.job_title || row['job title'] || row['Job Title'] || row.job_title || row.JOB_TITLE || '';
            juror.company = row.company || row.Company || row.COMPANY || '';
            
            return juror;
          }).filter(j => j.name && j.email);
          
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    const isCSV = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx');

    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel (.xlsx) file.",
        variant: "destructive",
      });
      return;
    }

    try {
      let parsedData: Partial<Juror>[] = [];

      if (isCSV) {
        const reader = new FileReader();
        const csvText = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        parsedData = parseCSV(csvText);
      } else {
        parsedData = await parseExcel(file);
      }

      if (parsedData.length === 0) {
        toast({
          title: "No data found",
          description: "The file appears to be empty or invalid.",
          variant: "destructive",
        });
        return;
      }

      onDataParsed(parsedData);
      onOpenChange(false);
      toast({
        title: "File uploaded successfully",
        description: `${parsedData.length} jurors loaded for review.`,
      });
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: "Please check the file format and try again.",
        variant: "destructive",
      });
    }
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
          <DialogTitle>Upload CSV or Excel File</DialogTitle>
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
              Drag and drop your CSV or Excel file here, or click to select
            </p>
            <Input
              id="juror-file-upload"
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => document.getElementById('juror-file-upload')?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Make sure your file includes headers: name, email, job_title (optional), company (optional).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}