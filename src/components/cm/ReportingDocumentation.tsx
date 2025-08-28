import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  BarChart3, 
  Users,
  Calendar,
  TrendingUp,
  Award,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface ReportingDocumentationProps {
  currentPhase: 'screeningPhase' | 'pitchingPhase';
}

export const ReportingDocumentation = ({ currentPhase }: ReportingDocumentationProps) => {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerateReport = async (reportType: string) => {
    setGenerating(reportType);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${reportType} report generated successfully`);
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const reports = [
    {
      id: 'evaluation-summary',
      title: 'Evaluation Summary Report',
      description: 'Complete evaluation results and statistical analysis',
      icon: BarChart3,
      type: 'primary'
    },
    {
      id: 'juror-contributions',
      title: 'Juror Contribution Report', 
      description: 'Individual juror scoring patterns and participation metrics',
      icon: Users,
      type: 'secondary'
    },
    {
      id: 'startup-rankings',
      title: 'Startup Rankings Export',
      description: 'Ranked list of all startups with scores and status',
      icon: Award,
      type: 'secondary'
    },
    {
      id: 'phase-summary',
      title: `${currentPhase === 'screeningPhase' ? 'Screening Phase' : 'Pitching Phase'} Summary`,
      description: `Complete ${currentPhase === 'screeningPhase' ? 'evaluation' : 'pitch'} phase documentation`,
      icon: FileText,
      type: 'primary'
    }
  ];

  if (currentPhase === 'pitchingPhase') {
    reports.push(
      {
        id: 'pitch-analytics',
        title: 'Pitch Session Analytics',
        description: 'Meeting completion rates and scheduling statistics',
        icon: Calendar,
        type: 'secondary'
      },
      {
        id: 'final-recommendations',
        title: 'Final Investment Recommendations',
        description: 'Consolidated recommendations and deal flow summary',
        icon: TrendingUp,
        type: 'primary'
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Reporting & Documentation - {currentPhase === 'screeningPhase' ? 'Screening Phase' : 'Pitching Phase'}
          </CardTitle>
          <CardDescription>
            Generate comprehensive reports and export data for stakeholders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {currentPhase === 'screeningPhase' ? '156' : '30'}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentPhase === 'screeningPhase' ? 'Startups Evaluated' : 'Startups in Pitching Phase'}
              </div>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {currentPhase === 'screeningPhase' ? '98%' : '85%'}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentPhase === 'screeningPhase' ? 'Evaluations Complete' : 'Pitches Completed'}
              </div>
            </div>
            <div className="text-center p-4 bg-warning/10 rounded-lg">
              <div className="text-2xl font-bold text-warning">
                {currentPhase === 'screeningPhase' ? '7.3' : '8.1'}
              </div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(report => {
          const IconComponent = report.icon;
          const isGenerating = generating === report.id;
          
          return (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconComponent className="w-5 h-5" />
                  {report.title}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    variant={report.type === 'primary' ? 'default' : 'outline'}
                    onClick={() => handleGenerateReport(report.title)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common reporting and documentation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Export All Scores (CSV)
            </Button>
            <Button variant="outline" size="sm">
              Email Report to Stakeholders
            </Button>
            <Button variant="outline" size="sm">
              Archive {currentPhase === 'screeningPhase' ? 'Screening Phase' : 'Pitching Phase'} Data
            </Button>
            <Button variant="outline" size="sm">
              Generate Executive Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};