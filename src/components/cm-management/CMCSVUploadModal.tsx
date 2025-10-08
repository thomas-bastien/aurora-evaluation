import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

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

interface CMCSVUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataParsed: (data: Partial<CommunityManager>[]) => void;
}

export function CMCSVUploadModal({ open, onOpenChange, onDataParsed }: CMCSVUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const parseCSV = (csvText: string): Partial<CommunityManager>[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

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
    const data: Partial<CommunityManager>[] = [];

    console.log('CSV Headers found:', headers);

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const cm: Partial<CommunityManager> = {
        can_manage_startups: true,
        can_manage_jurors: true,
        can_invite_cms: false
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        const normalizedHeader = header.toLowerCase().trim();
        
        if (value) {
          switch (normalizedHeader) {
            case 'name':
              cm.name = value;
              break;
            case 'email':
              cm.email = value;
              break;
            case 'job_title':
            case 'job title':
              cm.job_title = value;
              break;
            case 'organization':
            case 'company':
              cm.organization = value;
              break;
            case 'linkedin_url':
            case 'linkedin':
              cm.linkedin_url = value;
              break;
            case 'can_manage_startups':
              cm.can_manage_startups = value.toLowerCase() === 'true' || value === '1';
              break;
            case 'can_manage_jurors':
              cm.can_manage_jurors = value.toLowerCase() === 'true' || value === '1';
              break;
            case 'can_invite_cms':
              cm.can_invite_cms = value.toLowerCase() === 'true' || value === '1';
              break;
          }
        }
      });

      if (cm.name && cm.email) {
        data.push(cm);
      }
    }

    console.log(`CSV parsed: ${data.length} valid CMs from ${lines.length - 1} rows`);
    return data;
  };

  const parseExcel = (file: File): Promise<Partial<CommunityManager>[]> => {
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

          const parsed: Partial<CommunityManager>[] = jsonData.map((row: any) => {
            const cm: Partial<CommunityManager> = {
              can_manage_startups: true,
              can_manage_jurors: true,
              can_invite_cms: false
            };
            
            Object.keys(row).forEach(columnName => {
              const value = row[columnName];
              const normalized = columnName.toLowerCase().trim();
              
              if (value) {
                switch (normalized) {
                  case 'name':
                    cm.name = String(value).trim();
                    break;
                  case 'email':
                    cm.email = String(value).trim();
                    break;
                  case 'job_title':
                  case 'job title':
                    cm.job_title = String(value).trim();
                    break;
                  case 'organization':
                  case 'company':
                    cm.organization = String(value).trim();
                    break;
                  case 'linkedin_url':
                  case 'linkedin':
                    cm.linkedin_url = String(value).trim();
                    break;
                  case 'can_manage_startups':
                    cm.can_manage_startups = String(value).toLowerCase() === 'true' || value === 1;
                    break;
                  case 'can_manage_jurors':
                    cm.can_manage_jurors = String(value).toLowerCase() === 'true' || value === 1;
                    break;
                  case 'can_invite_cms':
                    cm.can_invite_cms = String(value).toLowerCase() === 'true' || value === 1;
                    break;
                }
              }
            });
            
            return cm;
          }).filter(cm => cm.name && cm.email);
          
          console.log(`Excel parsed: ${parsed.length} valid CMs`);
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
      let parsedData: Partial<CommunityManager>[] = [];

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
          description: "Could not find required fields (name and email).",
          variant: "destructive",
        });
        return;
      }

      onDataParsed(parsedData);
      onOpenChange(false);
      toast({
        title: "File uploaded successfully",
        description: `${parsedData.length} community managers loaded for review.`,
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
              id="cm-file-upload"
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => document.getElementById('cm-file-upload')?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Required: name, email. Optional: job_title, organization, linkedin_url, can_manage_startups, can_manage_jurors, can_invite_cms
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
