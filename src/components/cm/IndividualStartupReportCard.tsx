import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, FileUser, Loader2, PackageOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateStartupReportDocx, generateAndDownloadAllReports } from '@/utils/individualStartupReportDocx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StartupOption {
  id: string;
  name: string;
  founderFirstName: string | null;
  evaluationCount: number;
  hasApprovedFeedback: boolean;
}

interface IndividualStartupReportCardProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const IndividualStartupReportCard = ({ currentRound }: IndividualStartupReportCardProps) => {
  const { toast } = useToast();
  const [selectedStartup, setSelectedStartup] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, name: '' });
  const [loading, setLoading] = useState(true);
  const [startups, setStartups] = useState<StartupOption[]>([]);

  const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';

  // Fetch startups with approved VC feedback
  useEffect(() => {
    const fetchStartups = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('startup_vc_feedback_details')
          .select(`
            startup_id,
            evaluation_count,
            is_approved,
            startups!inner(
              id,
              name,
              founder_first_name
            )
          `)
          .eq('round_name', roundName)
          .eq('is_approved', true)
          .order('startups(name)');

        if (error) throw error;

        const startupOptions: StartupOption[] = (data || []).map(item => ({
          id: item.startup_id,
          name: (item.startups as any).name,
          founderFirstName: (item.startups as any).founder_first_name,
          evaluationCount: item.evaluation_count || 0,
          hasApprovedFeedback: item.is_approved
        }));

        // Remove duplicates (in case of multiple feedback entries)
        const uniqueStartups = startupOptions.reduce((acc, current) => {
          const exists = acc.find(s => s.id === current.id);
          if (!exists) {
            acc.push(current);
          }
          return acc;
        }, [] as StartupOption[]);

        setStartups(uniqueStartups);
      } catch (error: any) {
        console.error('Error fetching startups:', error);
        toast({
          title: "Error",
          description: "Failed to load startups with approved feedback",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStartups();
  }, [roundName, toast]);

  const handleDownload = async () => {
    if (!selectedStartup) return;

    setGenerating(true);
    try {
      await generateStartupReportDocx(selectedStartup, roundName);
      toast({
        title: "Success",
        description: "Word document generated successfully! You can now upload it to Google Drive."
      });
    } catch (error: any) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate Word document",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (startups.length === 0) return;

    setGeneratingAll(true);
    setBulkProgress({ current: 0, total: startups.length, name: '' });

    try {
      const startupIds = startups.map(s => s.id);
      
      await generateAndDownloadAllReports(
        startupIds,
        roundName,
        (current, total, startupName) => {
          setBulkProgress({ current, total, name: startupName });
        }
      );

      toast({
        title: "Success",
        description: `Generated ${startups.length} feedback letter${startups.length > 1 ? 's' : ''} successfully! ZIP file downloaded.`
      });
    } catch (error: any) {
      console.error('Error generating bulk reports:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate reports",
        variant: "destructive"
      });
    } finally {
      setGeneratingAll(false);
      setBulkProgress({ current: 0, total: 0, name: '' });
    }
  };

  const selectedStartupData = startups.find(s => s.id === selectedStartup);

  return (
    <Card className="border-secondary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileUser className="w-5 h-5 text-secondary" />
          <div>
            <CardTitle>Individual Startup Reports</CardTitle>
            <CardDescription>
              Generate editable Word documents for founder feedback letters
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bulk Download Section */}
          {startups.length > 1 && (
            <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3">
              <div className="flex items-start gap-3">
                <PackageOpen className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">
                    Download All Reports at Once
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Generate Word documents for all {startups.length} startups with approved feedback 
                    and download as a single ZIP file.
                  </p>
                  
                  {/* Progress indicator during bulk generation */}
                  {generatingAll && bulkProgress.total > 0 && (
                    <div className="mb-3 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Processing: {bulkProgress.name}
                        </span>
                        <span>
                          {bulkProgress.current} / {bulkProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-secondary/20 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(bulkProgress.current / bulkProgress.total) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleDownloadAll}
                    disabled={generatingAll || loading}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    {generatingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating {bulkProgress.current}/{bulkProgress.total} documents...
                      </>
                    ) : (
                      <>
                        <PackageOpen className="w-4 h-4 mr-2" />
                        Download All {startups.length} Reports (ZIP)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Divider if both sections present */}
          {startups.length > 1 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or download individually
                </span>
              </div>
            </div>
          )}

          {/* Startup Selector */}
          <div>
            <Label>Select Startup</Label>
            <Select
              value={selectedStartup || ''}
              onValueChange={setSelectedStartup}
              disabled={loading || startups.length === 0 || generatingAll}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    loading 
                      ? "Loading startups..." 
                      : startups.length === 0 
                        ? "No startups with approved feedback" 
                        : "Search for a startup..."
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {startups.map(startup => (
                  <SelectItem key={startup.id} value={startup.id}>
                    {startup.name} - {startup.evaluationCount} VC evaluation{startup.evaluationCount !== 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-2">
            <p className="font-medium">This will generate an editable Word document that:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Matches the Aurora feedback letter template</li>
              <li>Includes personalized greeting with founder name</li>
              <li>Contains VC feedback from {selectedStartupData?.evaluationCount || 'all'} evaluator{selectedStartupData?.evaluationCount !== 1 ? 's' : ''}</li>
              <li>Has Aurora branding and professional formatting</li>
              <li>Can be uploaded to Google Drive and edited there</li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-md space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">After downloading:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-blue-800 dark:text-blue-200">
              <li>Upload the .docx file to Google Drive</li>
              <li>Open with Google Docs to edit if needed</li>
              <li>Share the link with the founder</li>
            </ol>
          </div>

          {/* Individual Download Button */}
          <Button
            onClick={handleDownload}
            disabled={!selectedStartup || generating || loading || generatingAll}
            variant="outline"
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Word Document...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Selected Report (.docx)
              </>
            )}
          </Button>

          {!loading && startups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No startups have approved VC feedback for the {roundName} round yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
