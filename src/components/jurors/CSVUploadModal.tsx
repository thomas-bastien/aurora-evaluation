import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { mapJurorColumn, parseArrayField, parseNumericField } from '@/utils/columnMapping';

interface Juror {
  name: string;
  email: string;
  job_title?: string;
  company?: string;
  linkedin_url?: string;
  calendly_link?: string;
  preferred_stages?: string[];
  target_verticals?: string[];
  preferred_regions?: string[];
  evaluation_limit?: number;
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

    const headers = parseCSVLine(lines[0]);
    const data: Partial<Juror>[] = [];

    console.log('CSV Headers found:', headers);

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const juror: Partial<Juror> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        const mappedField = mapJurorColumn(header);
        
        if (mappedField && value) {
          switch (mappedField) {
            case 'evaluation_limit':
            case 'meeting_limit':
              juror[mappedField] = parseNumericField(value);
              break;
            case 'preferred_stages':
            case 'target_verticals':
            case 'preferred_regions':
              juror[mappedField] = parseArrayField(value);
              break;
            default:
              juror[mappedField] = value;
          }
        }
      });

      if (juror.name && juror.email) {
        data.push(juror);
      }
    }

    console.log(`CSV parsed: ${data.length} valid jurors from ${lines.length - 1} rows`);
    if (data.length > 0) {
      console.log('Sample juror:', data[0]);
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
          
          if (jsonData.length === 0) {
            console.warn('Excel file has no data rows');
            resolve([]);
            return;
          }

          // Log detected columns for debugging
          const columnNames = Object.keys(jsonData[0]);
          console.log('Excel columns found:', columnNames);
          
          const parsed: Partial<Juror>[] = jsonData.map((row: any, index: number) => {
            const juror: Partial<Juror> = {};
            
            // Iterate through all columns and map them dynamically
            Object.keys(row).forEach(columnName => {
              const mappedField = mapJurorColumn(columnName);
              const value = row[columnName];
              
              if (mappedField && value) {
                switch (mappedField) {
                  case 'evaluation_limit':
                  case 'meeting_limit':
                    juror[mappedField] = parseNumericField(value);
                    break;
                  case 'preferred_stages':
                  case 'target_verticals':
                  case 'preferred_regions':
                    juror[mappedField] = parseArrayField(value);
                    break;
                  default:
                    juror[mappedField] = String(value).trim();
                }
              }
            });
            
            return juror;
          }).filter(j => j.name && j.email);
          
          console.log(`Excel parsed: ${parsed.length} valid jurors from ${jsonData.length} rows`);
          if (parsed.length > 0) {
            console.log('Sample juror:', parsed[0]);
          } else if (jsonData.length > 0) {
            console.warn('No valid jurors found. Sample row data:', jsonData[0]);
            console.warn('Required fields: name and email');
          }
          
          resolve(parsed);
        } catch (error) {
          console.error('Error parsing Excel:', error);
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
          description: "Could not find required fields (name and email). Check console for detected columns.",
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