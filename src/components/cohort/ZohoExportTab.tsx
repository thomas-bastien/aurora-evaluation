import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCohortSettings } from '@/hooks/useCohortSettings';
import {
  generateVCFundsCSV,
  generateJurorsCSV,
  generateStartupsCSV,
  generateFoundersCSV,
  generateDealsCSV,
  generateDealContactRolesCSV,
  createZohoExportZIP,
  downloadZIPFile,
  getExportPreviewCounts
} from '@/utils/zohoExportUtils';
import { useQuery } from '@tanstack/react-query';
import { ZohoExportPreviewModal } from './ZohoExportPreviewModal';
import { ZohoExportInstructions } from './ZohoExportInstructions';

export function ZohoExportTab() {
  const { toast } = useToast();
  const { cohortSettings } = useCohortSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: previewCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['zoho-export-preview'],
    queryFn: getExportPreviewCounts
  });

  const handleGenerateExport = async () => {
    setIsExporting(true);
    
    try {
      toast({
        title: 'Generating export...',
        description: 'This may take a minute for large datasets',
      });

      // Generate all CSV files
      const vcFundsCSV = await generateVCFundsCSV();
      const jurorsCSV = await generateJurorsCSV();
      const startupsCSV = await generateStartupsCSV();
      const foundersCSV = await generateFoundersCSV();
      const dealsCSV = await generateDealsCSV();
      const dealContactRolesCSV = await generateDealContactRolesCSV();

      // Create ZIP file
      const zipBlob = await createZohoExportZIP({
        'VC_Funds.csv': vcFundsCSV,
        'Jurors.csv': jurorsCSV,
        'Startups.csv': startupsCSV,
        'Founders.csv': foundersCSV,
        'Deals.csv': dealsCSV,
        'Deal_Contact_Roles.csv': dealContactRolesCSV
      });

      // Download ZIP
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Aurora_Zoho_Export_${timestamp}.zip`;
      downloadZIPFile(zipBlob, filename);

      toast({
        title: 'Export complete',
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Failed to generate export. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!cohortSettings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Please configure cohort settings first
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zoho CRM Export</CardTitle>
          <CardDescription>
            Generate CSV files for manual import to Zoho CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cohort Info */}
          <div className="space-y-2">
            <h3 className="font-medium">Current Cohort</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Name:</strong> {cohortSettings.cohort_name}</p>
              {cohortSettings.screening_deadline && (
                <p><strong>Screening Deadline:</strong> {new Date(cohortSettings.screening_deadline).toLocaleDateString()}</p>
              )}
              {cohortSettings.pitching_deadline && (
                <p><strong>Pitching Deadline:</strong> {new Date(cohortSettings.pitching_deadline).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          {/* Export Preview */}
          <div className="space-y-3">
            <h3 className="font-medium">Ready to Export</h3>
            {countsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading preview...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span>🏢</span>
                  <span><strong>VC Funds:</strong> {previewCounts?.vcFunds || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>👥</span>
                  <span><strong>Jurors:</strong> {previewCounts?.jurors || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>🚀</span>
                  <span><strong>Startups:</strong> {previewCounts?.startups || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>👤</span>
                  <span><strong>Founders:</strong> {previewCounts?.founders || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>🤝</span>
                  <span><strong>Deals:</strong> {previewCounts?.deals || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>🔗</span>
                  <span><strong>Contact Roles:</strong> {previewCounts?.dealContactRoles || 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={countsLoading}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Sample Data
            </Button>
            <Button
              onClick={handleGenerateExport}
              disabled={isExporting || countsLoading}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <ZohoExportInstructions />

      {/* Preview Modal */}
      {showPreview && (
        <ZohoExportPreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
