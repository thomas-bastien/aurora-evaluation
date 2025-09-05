import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  Search, 
  ArrowUpDown, 
  CheckCircle, 
  Trophy, 
  Filter,
  Eye,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

interface StartupEvaluation {
  id: string;
  name: string;
  description: string;
  industry: string;
  stage: string;
  location: string;
  region: string;
  evaluationsReceived: number;
  totalAssigned: number;
  averageScore: number | null;
  totalScore: number;
  rank: number;
  status: 'completed' | 'in-progress' | 'pending';
  lastUpdated: string;
}

type SortField = 'rank' | 'name' | 'averageScore' | 'evaluationsReceived' | 'stage' | 'region';
type SortDirection = 'asc' | 'desc';

interface EvaluationProgressViewProps {
  currentRound?: string;
}

export const EvaluationProgressView = ({ currentRound = 'screening' }: EvaluationProgressViewProps) => {
  const [startups, setStartups] = useState<StartupEvaluation[]>([]);
  const [filteredStartups, setFilteredStartups] = useState<StartupEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [completionStats, setCompletionStats] = useState({
    totalEvaluations: 0,
    completedEvaluations: 0,
    completionRate: 0,
    averageScore: 0
  });

  useEffect(() => {
    fetchEvaluationProgress();
  }, []);

  useEffect(() => {
    filterAndSortStartups();
  }, [startups, searchTerm, stageFilter, regionFilter, statusFilter, sortField, sortDirection]);

  const fetchEvaluationProgress = async () => {
    try {
      // Determine which tables to use based on current round
      const assignmentTable = currentRound === 'screening' ? 'screening_assignments' : 'pitching_assignments';
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';

      // Fetch startups with their evaluations and assignments
      const { data: startupsData, error } = await supabase
        .from('startups')
        .select(`
          *,
          ${assignmentTable}!startup_id(id, status),
          ${evaluationTable}!startup_id(
            id,
            overall_score,
            status,
            updated_at
          )
        `);

      if (error) throw error;

      let totalEvaluations = 0;
      let completedEvaluations = 0;
      let totalScoreSum = 0;
      let validScoreCount = 0;

      const evaluationData: StartupEvaluation[] = startupsData?.map(startup => {
        const assignmentKey = currentRound === 'screening' ? 'screening_assignments' : 'pitching_assignments';
        const evaluationKey = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
        
        const assignments = startup[assignmentKey] || [];
        const evaluations = startup[evaluationKey] || [];
        const submittedEvaluations = evaluations.filter((e: any) => e.status === 'submitted');
        
        totalEvaluations += assignments.length;
        completedEvaluations += submittedEvaluations.length;
        
        const scores = submittedEvaluations
          .map((e: any) => e.overall_score)
          .filter((score: any) => score !== null) as number[];
        
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : null;
        
        if (averageScore !== null) {
          totalScoreSum += averageScore;
          validScoreCount++;
        }
        
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        // Determine status
        let status: 'completed' | 'in-progress' | 'pending' = 'pending';
        if (submittedEvaluations.length === assignments.length && assignments.length > 0) {
          status = 'completed';
        } else if (submittedEvaluations.length > 0) {
          status = 'in-progress';
        }
        
        const lastUpdated = evaluations
          .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at || startup.updated_at;
        
        return {
          id: startup.id,
          name: startup.name,
          description: startup.description || '',
          industry: startup.industry || 'N/A',
          stage: startup.stage || 'N/A',
          location: startup.location || 'N/A',
          region: startup.region || 'N/A',
          evaluationsReceived: submittedEvaluations.length,
          totalAssigned: assignments.length,
          averageScore,
          totalScore,
          rank: 0, // Will be set after sorting
          status,
          lastUpdated
        };
      }) || [];

      // Sort by total score and assign ranks
      const sortedStartups = evaluationData
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((startup, index) => ({ ...startup, rank: index + 1 }));

      setStartups(sortedStartups);
      
      setCompletionStats({
        totalEvaluations,
        completedEvaluations,
        completionRate: totalEvaluations > 0 ? (completedEvaluations / totalEvaluations) * 100 : 0,
        averageScore: validScoreCount > 0 ? totalScoreSum / validScoreCount : 0
      });

    } catch (error) {
      console.error('Error fetching evaluation progress:', error);
      toast.error('Failed to load evaluation progress');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortStartups = () => {
    let filtered = [...startups];

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(startup => 
        startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(startup => startup.stage === stageFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(startup => startup.region === regionFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(startup => startup.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'averageScore') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredStartups(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-primary text-primary-foreground">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-primary transition-colors"
    >
      {children}
      <ArrowUpDown className="w-4 h-4" />
    </button>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueStages = [...new Set(startups.map(s => s.stage))].filter(s => s !== 'N/A');
  const uniqueRegions = [...new Set(startups.map(s => s.region))].filter(r => r !== 'N/A');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Evaluation Progress Overview
            </CardTitle>
            <CardDescription>
              Review all startup evaluations and rankings
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchEvaluationProgress}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search startups by name, industry, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {uniqueStages.map(stage => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{startups.length}</div>
            <div className="text-sm text-muted-foreground">Total Startups</div>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{completionStats.completionRate.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{completionStats.completedEvaluations}</div>
            <div className="text-sm text-muted-foreground">Completed Evaluations</div>
          </div>
          <div className="text-center p-4 bg-accent/10 rounded-lg">
            <div className="text-2xl font-bold text-accent">{completionStats.averageScore.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </div>
        </div>

        {/* Startup Rankings Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b border-border">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">
                <SortableHeader field="rank">Rank</SortableHeader>
              </div>
              <div className="col-span-3">
                <SortableHeader field="name">Startup</SortableHeader>
              </div>
              <div className="col-span-1">
                <SortableHeader field="stage">Stage</SortableHeader>
              </div>
              <div className="col-span-1">
                <SortableHeader field="region">Region</SortableHeader>
              </div>
              <div className="col-span-2">
                <SortableHeader field="evaluationsReceived">Evaluations</SortableHeader>
              </div>
              <div className="col-span-1">
                <SortableHeader field="averageScore">Avg Score</SortableHeader>
              </div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          <div className="divide-y divide-border">
            {filteredStartups.map(startup => (
              <div key={startup.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      {startup.rank <= 30 && <Trophy className="w-4 h-4 text-warning" />}
                      <span className="font-medium">{startup.rank}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{startup.name}</h4>
                      <p className="text-sm text-muted-foreground">{startup.industry}</p>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Badge variant="outline">{startup.stage}</Badge>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm">{startup.region}</span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(startup.evaluationsReceived / startup.totalAssigned) * 100} 
                        className="flex-1 h-2" 
                      />
                      <span className="text-sm font-medium">
                        {startup.evaluationsReceived}/{startup.totalAssigned}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className="font-semibold text-lg">
                      {startup.averageScore?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(startup.status)}
                  </div>
                  <div className="col-span-1">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {filteredStartups.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No startups found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};