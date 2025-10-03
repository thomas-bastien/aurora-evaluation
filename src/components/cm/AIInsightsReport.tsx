import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoundInsights } from "@/hooks/useRoundInsights";
import { 
  Bot, 
  RefreshCw, 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  Scale, 
  AlertCircle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { exportAIInsightsCSV, exportAIInsightsPDF } from "@/utils/reportExports";
import { formatDistanceToNow } from 'date-fns';

interface AIInsightsReportProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const AIInsightsReport = ({ currentRound }: AIInsightsReportProps) => {
  const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';
  const { insights, loading, error, lastGenerated, refresh, canRefresh } = useRoundInsights(roundName);

  const handleRefresh = async () => {
    if (!canRefresh) {
      toast.error('Please wait 5 minutes before refreshing again');
      return;
    }
    
    toast.promise(refresh(), {
      loading: 'Regenerating insights...',
      success: 'Insights updated successfully',
      error: 'Failed to regenerate insights'
    });
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!insights) return;
    
    try {
      if (format === 'csv') {
        exportAIInsightsCSV(insights, roundName);
      } else {
        exportAIInsightsPDF(insights, roundName);
      }
      toast.success(`AI Insights exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export insights');
    }
  };

  const getSeverityColor = (significance: string) => {
    switch (significance) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getOutlierIcon = (type: string) => {
    switch (type) {
      case 'high_score': return '🔥';
      case 'low_score': return '⚠️';
      case 'polarized': return '🔀';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI-Generated Insights
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI-Generated Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>Unable to generate insights. {error?.message || 'Please try again later.'}</p>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI-Generated Insights
            </CardTitle>
            <CardDescription>
              {lastGenerated && `Generated ${formatDistanceToNow(new Date(lastGenerated), { addSuffix: true })}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={!canRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Executive Summary
          </h3>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <ul className="space-y-2">
              {insights.executive_summary.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Cohort-Wide Patterns */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cohort-Wide Patterns
          </h3>
          <div className="space-y-3">
            {insights.cohort_patterns.map((pattern, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(pattern.significance)}>
                        {pattern.significance.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">{pattern.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{pattern.finding}</p>
                  </div>
                  <span className="text-2xl font-bold text-primary ml-4">
                    {pattern.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outliers & Anomalies */}
        {insights.outliers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Outliers & Anomalies
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Startup</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Explanation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.outliers.map((outlier, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{outlier.startup_name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {getOutlierIcon(outlier.type)}
                          {outlier.type.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>{outlier.score.toFixed(2)}</TableCell>
                      <TableCell>{outlier.score_variance.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {outlier.explanation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Bias & Consistency Check */}
        {insights.bias_check.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Bias & Consistency Check
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Juror</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Avg Score Given</TableHead>
                    <TableHead>Cohort Avg</TableHead>
                    <TableHead>Deviation</TableHead>
                    <TableHead>Assessment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.bias_check.map((bias, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{bias.juror_name}</TableCell>
                      <TableCell className="text-sm">{bias.pattern}</TableCell>
                      <TableCell>{bias.avg_score_given.toFixed(2)}</TableCell>
                      <TableCell>{bias.cohort_avg.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={Math.abs(bias.deviation) > 1 ? 'destructive' : 'secondary'}>
                          {bias.deviation > 0 ? '+' : ''}{bias.deviation.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bias.assessment}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Common Risk Themes */}
        {insights.risk_themes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Common Risk Themes
            </h3>
            <Accordion type="single" collapsible className="border rounded-lg">
              {insights.risk_themes.map((theme, index) => (
                <AccordionItem key={index} value={`theme-${index}`}>
                  <AccordionTrigger className="px-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{theme.theme}</span>
                      <Badge variant="outline">{theme.frequency} mentions</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Examples:</p>
                      <ul className="space-y-1">
                        {theme.examples.map((example, exIndex) => (
                          <li key={exIndex} className="text-sm flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Confidentiality Notice */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          🔒 Confidential - Internal Use Only | AI-Generated Analysis
        </div>
      </CardContent>
    </Card>
  );
};
