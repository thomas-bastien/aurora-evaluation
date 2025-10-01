import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ClipboardCheck, Download, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { 
  generateEvaluationDecisionData, 
  exportEvaluationDecisionCSV,
  exportEvaluationDecisionCSVFull,
  exportEvaluationDecisionPDF
} from "@/utils/evaluationDecisionReport";

interface EvaluationDecisionReportCardProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const EvaluationDecisionReportCard = ({ currentRound }: EvaluationDecisionReportCardProps) => {
  const [generating, setGenerating] = useState(false);
  const [showFullCSVWarning, setShowFullCSVWarning] = useState(false);

  const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';

  const handleExport = async (format: 'csv' | 'csv-full' | 'pdf') => {
    if (format === 'csv-full') {
      setShowFullCSVWarning(true);
      return;
    }

    setGenerating(true);
    try {
      const data = await generateEvaluationDecisionData(roundName);
      
      if (data.length === 0) {
        toast.error('No evaluation data available for this round');
        return;
      }

      if (format === 'csv') {
        exportEvaluationDecisionCSV(data, roundName);
        toast.success('CSV exported successfully (standard version)');
      } else if (format === 'pdf') {
        exportEvaluationDecisionPDF(data, roundName);
        toast.success('PDF exported successfully');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setGenerating(false);
    }
  };

  const handleFullCSVExport = async () => {
    setShowFullCSVWarning(false);
    setGenerating(true);
    try {
      const data = await generateEvaluationDecisionData(roundName);
      
      if (data.length === 0) {
        toast.error('No evaluation data available for this round');
        return;
      }

      exportEvaluationDecisionCSVFull(data, roundName);
      toast.success('Full CSV exported successfully (includes internal scores)');
    } catch (error) {
      console.error('Error exporting full CSV:', error);
      toast.error('Failed to export full CSV');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Evaluation Decision Report</CardTitle>
                <CardDescription className="mt-1">
                  Comprehensive evaluation data for Aurora decision-making
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">This report includes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Startup profile information (founders, region, vertical, stage)</li>
                <li>Internal Aurora scores (admin version only)</li>
                <li>Individual VC scores from screening and pitching rounds</li>
                <li>Average scores and VC pitch request counts</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleExport('csv')}
                disabled={generating}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV Export (Standard)
              </Button>

              <Button
                onClick={() => handleExport('csv-full')}
                disabled={generating}
                variant="outline"
                className="flex items-center gap-2 border-warning text-warning hover:bg-warning/10"
              >
                <AlertTriangle className="w-4 h-4" />
                CSV Export (Full)
              </Button>

              <Button
                onClick={() => handleExport('pdf')}
                disabled={generating}
                variant="default"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF Export
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <p className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-warning" />
                <strong>Admin version</strong> includes internal scores and is marked as confidential
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showFullCSVWarning} onOpenChange={setShowFullCSVWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Export Full CSV with Internal Scores?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This export will include <strong>internal Aurora scores</strong> that are not visible to VCs.
              </p>
              <p className="text-warning font-medium">
                ⚠️ Please ensure this file is handled securely and only shared with authorized Aurora team members.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFullCSVExport} className="bg-warning hover:bg-warning/90">
              Export Full CSV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
