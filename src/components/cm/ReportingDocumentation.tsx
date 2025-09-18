import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  BarChart3, 
  Users,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { 
  exportEvaluationSummaryCSV, 
  exportEvaluationSummaryPDF, 
  exportJurorContributionCSV, 
  exportJurorContributionPDF,
  exportPitchAnalyticsCSV,
  exportPitchAnalyticsPDF,
  fetchJurorContributionData,
  fetchPitchAnalyticsData,
  type StartupAnalytics as ExportStartupAnalytics
} from "@/utils/reportExports";

interface ReportingDocumentationProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

interface RoundStats {
  totalStartups: number;
  completionRate: number;
  averageScore: number;
}

interface StartupAnalytics {
  id: string;
  name: string;
  status: string;
  evaluationsComplete: number;
  totalEvaluations: number;
  averageScore: number | null;
  lastUpdated: string;
}

export const ReportingDocumentation = ({ currentRound }: ReportingDocumentationProps) => {
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [stats, setStats] = useState<RoundStats>({
    totalStartups: 0,
    completionRate: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<StartupAnalytics[]>([]);
  const [filteredData, setFilteredData] = useState<StartupAnalytics[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRoundStats();
    fetchAnalyticsData();
  }, [currentRound]);

  useEffect(() => {
    filterAnalyticsData();
  }, [analyticsData, searchTerm, statusFilter]);

  const filterAnalyticsData = () => {
    let filtered = analyticsData;
    
    if (searchTerm) {
      filtered = filtered.filter(startup => 
        startup.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(startup => startup.status === statusFilter);
    }
    
    setFilteredData(filtered);
  };

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

  const fetchAnalyticsData = async () => {
    try {
      const tableName = currentRound === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
      const assignmentTable = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
      
      // Get startups with their evaluation status
      const { data: startups, error: startupsError } = await supabase
        .from('startups')
        .select(`
          id,
          name,
          status,
          created_at
        `);
      
      if (startupsError) throw startupsError;
      
      // Get evaluations
      const { data: evaluations, error: evaluationsError } = await supabase
        .from(tableName)
        .select(`
          startup_id,
          status,
          overall_score,
          updated_at
        `);
      
      if (evaluationsError) throw evaluationsError;
      
      // Get assignments to know total expected evaluations
      const { data: assignments, error: assignmentsError } = await supabase
        .from(assignmentTable)
        .select(`
          startup_id
        `);
      
      if (assignmentsError) throw assignmentsError;
      
      // Process analytics data
      const analyticsMap = new Map<string, StartupAnalytics>();
      
      startups?.forEach(startup => {
        const startupEvaluations = evaluations?.filter(e => e.startup_id === startup.id) || [];
        const startupAssignments = assignments?.filter(a => a.startup_id === startup.id) || [];
        const submittedEvaluations = startupEvaluations.filter(e => e.status === 'submitted');
        
        const scores = submittedEvaluations
          .filter(e => e.overall_score !== null)
          .map(e => e.overall_score);
        const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
        
        const lastEvaluation = startupEvaluations
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
        
        analyticsMap.set(startup.id, {
          id: startup.id,
          name: startup.name,
          status: startup.status || 'pending',
          evaluationsComplete: submittedEvaluations.length,
          totalEvaluations: startupAssignments.length,
          averageScore,
          lastUpdated: lastEvaluation?.updated_at || startup.created_at || new Date().toISOString()
        });
      });
      
      setAnalyticsData(Array.from(analyticsMap.values()));
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    }
  };

  const handleGenerateReport = async (reportType: string, format: 'csv' | 'pdf') => {
    setGeneratingReport(`${reportType}-${format}`);
    
    try {
      switch (reportType) {
        case 'Evaluation Summary Report':
          if (format === 'csv') {
            exportEvaluationSummaryCSV(analyticsData, currentRound.replace('Round', ''));
          } else {
            exportEvaluationSummaryPDF(analyticsData, currentRound.replace('Round', ''), stats);
          }
          break;
          
        case 'Juror Contribution Report':
          const jurorData = await fetchJurorContributionData(currentRound);
          if (format === 'csv') {
            exportJurorContributionCSV(jurorData, currentRound.replace('Round', ''));
          } else {
            exportJurorContributionPDF(jurorData, currentRound.replace('Round', ''), stats);
          }
          break;
          
        case 'Pitch Session Analytics':
          if (currentRound === 'pitchingRound') {
            const pitchData = await fetchPitchAnalyticsData();
            if (format === 'csv') {
              exportPitchAnalyticsCSV(pitchData, currentRound.replace('Round', ''));
            } else {
              exportPitchAnalyticsPDF(pitchData, currentRound.replace('Round', ''), stats);
            }
          } else {
            toast.error('Pitch analytics only available for pitching round');
            return;
          }
          break;
          
        default:
          throw new Error('Unknown report type');
      }
      
      toast.success(`${reportType} ${format.toUpperCase()} exported successfully`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Failed to export ${reportType} as ${format.toUpperCase()}`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleExportAllData = () => {
    exportEvaluationSummaryCSV(analyticsData, currentRound.replace('Round', ''));
    toast.success('All analytics data exported as CSV');
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
            <BarChart3 className="w-5 h-5" />
            Real-Time Analytics & Reports - {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
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

      {/* Real-Time Analytics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Real-Time Startup Analytics
            </CardTitle>
            <Button
              variant="outline" 
              size="sm"
              onClick={fetchAnalyticsData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Live view of startup evaluation progress and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search startups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Analytics Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Startup Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead className="text-center">Avg Score</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {analyticsData.length === 0 ? 'No data available' : 'No startups match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((startup) => (
                    <TableRow key={startup.id}>
                      <TableCell className="font-medium">{startup.name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          startup.status === 'selected' ? 'default' :
                          startup.status === 'under_review' ? 'secondary' :
                          startup.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {startup.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm">
                            {startup.evaluationsComplete}/{startup.totalEvaluations}
                          </span>
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ 
                                width: `${startup.totalEvaluations > 0 ? (startup.evaluationsComplete / startup.totalEvaluations) * 100 : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {startup.averageScore !== null ? (
                          <Badge variant="outline" className="font-mono">
                            {formatScore(startup.averageScore)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(startup.lastUpdated).toLocaleDateString()} {new Date(startup.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {reports.map(report => {
        const IconComponent = report.icon;
        const isGeneratingCSV = generatingReport === `${report.title}-csv`;
        const isGeneratingPDF = generatingReport === `${report.title}-pdf`;
          
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
                    variant="outline"
                    onClick={() => handleGenerateReport(report.title, "csv")}
                    disabled={isGeneratingCSV || isGeneratingPDF}
                  >
                    {isGeneratingCSV ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </>
                    )}
                  </Button>
                  <Button 
                    className="flex-1"
                    variant={report.type === 'primary' ? 'default' : 'secondary'}
                    onClick={() => handleGenerateReport(report.title, "pdf")}
                    disabled={isGeneratingCSV || isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Export PDF
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportAllData}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
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