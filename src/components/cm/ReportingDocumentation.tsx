import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
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
  currentRound: 'screeningRound' | 'pitchingRound';
}

interface RoundStats {
  totalStartups: number;
  completionRate: number;
  averageScore: number;
}

export const ReportingDocumentation = ({ currentRound }: ReportingDocumentationProps) => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [stats, setStats] = useState<RoundStats>({
    totalStartups: 0,
    completionRate: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoundStats();
  }, [currentRound]);

  const fetchRoundStats = async () => {
    try {
      setLoading(true);
      
      if (currentRound === 'screeningRound') {
        // Get startups under review count
        const { data: startups, error: startupsError } = await supabase
          .from('startups')
          .select('id, status');
        
        if (startupsError) throw startupsError;

        // Get evaluation stats
        const { data: evaluations, error: evaluationsError } = await supabase
          .from('screening_evaluations')
          .select('status, overall_score');
        
        if (evaluationsError) throw evaluationsError;

        // Get assignment count for completion rate calculation
        const { data: assignments, error: assignmentsError } = await supabase
          .from('screening_assignments')
          .select('id');
        
        if (assignmentsError) throw assignmentsError;

        const totalStartups = startups?.filter(s => ['under_review', 'selected'].includes(s.status)).length || 0;
        const submittedEvaluations = evaluations?.filter(e => e.status === 'submitted').length || 0;
        const totalAssignments = assignments?.length || 0;
        const completionRate = totalAssignments > 0 ? (submittedEvaluations / totalAssignments) * 100 : 0;
        
        // Calculate average score
        const scores = evaluations?.filter(e => e.status === 'submitted' && e.overall_score).map(e => e.overall_score) || [];
        const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

        setStats({
          totalStartups,
          completionRate,
          averageScore
        });
      } else {
        // Pitching round stats
        const { data: pitchRequests, error: pitchError } = await supabase
          .from('pitch_requests')
          .select('status, startup_id');
        
        if (pitchError) throw pitchError;

        // Get unique startups in pitching
        const uniqueStartups = new Set(pitchRequests?.map(pr => pr.startup_id)).size;
        const completedPitches = pitchRequests?.filter(pr => pr.status === 'completed').length || 0;
        const totalPitches = pitchRequests?.length || 0;
        const completionRate = totalPitches > 0 ? (completedPitches / totalPitches) * 100 : 0;

        // For pitching round, we might want post-pitch evaluation scores
        const { data: evaluations, error: evalError } = await supabase
          .from('pitching_evaluations')
          .select('overall_score')
          .eq('status', 'submitted');
        
        if (evalError) throw evalError;

        const scores = evaluations?.filter(e => e.overall_score).map(e => e.overall_score) || [];
        const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

        setStats({
          totalStartups: uniqueStartups,
          completionRate,
          averageScore
        });
      }
    } catch (error) {
      console.error('Error fetching round stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

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
    }
  ];

  if (currentRound === 'pitchingRound') {
    reports.push({
      id: 'pitch-analytics',
      title: 'Pitch Session Analytics',
      description: 'Meeting completion rates and scheduling statistics',
      icon: Calendar,
      type: 'secondary'
    });
  }

  return (
    <div className="space-y-6">
      {/* Phase Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Reporting & Documentation - {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
          </CardTitle>
          <CardDescription>
            Generate comprehensive reports and export data for stakeholders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center p-4 bg-muted rounded-lg">
                  <div className="h-8 w-16 bg-muted-foreground/20 rounded mx-auto mb-2 animate-pulse"></div>
                  <div className="h-4 w-24 bg-muted-foreground/20 rounded mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {stats.totalStartups}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentRound === 'screeningRound' ? 'Startups Evaluated' : 'Startups in Pitching'}
                </div>
              </div>
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {Math.round(stats.completionRate)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentRound === 'screeningRound' ? 'Evaluations Complete' : 'Pitches Completed'}
                </div>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning">
                  {formatScore(stats.averageScore)}
                </div>
                <div className="text-sm text-muted-foreground">Average Score</div>
              </div>
            </div>
          )}
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
              Archive {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'} Data
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