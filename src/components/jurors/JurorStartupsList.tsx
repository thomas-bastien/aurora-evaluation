import { useState, useEffect, useCallback } from 'react';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  RefreshCw,
  Eye,
  Users,
  Award,
  TrendingUp,
  ArrowUpDown,
  Filter,
  Building2,
  MapPin,
  Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StartupDetailsModal } from "@/components/common/StartupDetailsModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/hooks/use-toast";

interface StartupWithStats {
  id: string;
  name: string;
  description: string | null;
  verticals: string[];
  stage: string | null;
  regions: string[];
  pitch_deck_url: string | null;
  demo_url: string | null;
  contact_email: string | null;
  founder_names: string[];
  website: string | null;
  status: string;
  // Round-specific statuses
  screeningStatus: 'pending' | 'selected' | 'rejected' | 'under-review' | null;
  pitchingStatus: 'pending' | 'selected' | 'rejected' | 'under-review' | null;
  // Evaluation metrics
  screeningStats: {
    averageScore: number | null;
    evaluationCount: number;
  };
  pitchingStats: {
    averageScore: number | null;
    evaluationCount: number;
  };
  overallStats: {
    averageScore: number | null;
    totalEvaluations: number;
  };
}

interface JurorStartupsListProps {
  jurorId?: string;
}

export function JurorStartupsList({ jurorId }: JurorStartupsListProps) {
  const [startups, setStartups] = useState<StartupWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'overallScore' | 'screeningScore' | 'pitchingScore'>('overallScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'screening' | 'pitching'>('all');
  const [selectedForDetails, setSelectedForDetails] = useState<StartupWithStats | null>(null);
  const { toast } = useToast();

  const fetchStartupsWithStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all startups
      const { data: startupsData, error: startupsError } = await supabase
        .from('startups')
        .select(`
          id,
          name,
          description,
          verticals,
          stage,
          regions,
          pitch_deck_url,
          demo_url,
          contact_email,
          founder_names,
          website,
          status
        `)
        .order('name');

      if (startupsError) {
        console.error('Error fetching startups:', startupsError);
        throw startupsError;
      }

      // Fetch round statuses for all rounds
      const { data: roundStatusData, error: roundStatusError } = await supabase
        .from('startup_round_statuses')
        .select(`
          startup_id,
          status,
          rounds!inner(name)
        `)
        .in('startup_id', startupsData?.map(s => s.id) || []);

      if (roundStatusError) {
        console.error('Error fetching round statuses:', roundStatusError);
        throw roundStatusError;
      }

      // Create lookups for round statuses
      const screeningStatusLookup = roundStatusData?.reduce((acc, item) => {
        if (item.rounds?.name === 'screening') {
          acc[item.startup_id] = item.status as 'pending' | 'selected' | 'rejected' | 'under-review';
        }
        return acc;
      }, {} as Record<string, 'pending' | 'selected' | 'rejected' | 'under-review'>) || {};

      const pitchingStatusLookup = roundStatusData?.reduce((acc, item) => {
        if (item.rounds?.name === 'pitching') {
          acc[item.startup_id] = item.status as 'pending' | 'selected' | 'rejected' | 'under-review';
        }
        return acc;
      }, {} as Record<string, 'pending' | 'selected' | 'rejected' | 'under-review'>) || {};

      // Fetch screening evaluations
      const { data: screeningEvaluations, error: screeningError } = await supabase
        .from('screening_evaluations')
        .select('startup_id, overall_score, status')
        .eq('status', 'submitted');

      if (screeningError) {
        console.error('Error fetching screening evaluations:', screeningError);
        throw screeningError;
      }

      // Fetch pitching evaluations
      const { data: pitchingEvaluations, error: pitchingError } = await supabase
        .from('pitching_evaluations')
        .select('startup_id, overall_score, status')
        .eq('status', 'submitted');

      if (pitchingError) {
        console.error('Error fetching pitching evaluations:', pitchingError);
        throw pitchingError;
      }

      // Process screening evaluation stats
      const screeningStats = screeningEvaluations?.reduce((acc, evaluation) => {
        const startupId = evaluation.startup_id;
        if (!acc[startupId]) {
          acc[startupId] = { scores: [], count: 0 };
        }
        if (evaluation.overall_score) {
          acc[startupId].scores.push(evaluation.overall_score);
          acc[startupId].count += 1;
        }
        return acc;
      }, {} as Record<string, {scores: number[], count: number}>) || {};

      // Process pitching evaluation stats
      const pitchingStats = pitchingEvaluations?.reduce((acc, evaluation) => {
        const startupId = evaluation.startup_id;
        if (!acc[startupId]) {
          acc[startupId] = { scores: [], count: 0 };
        }
        if (evaluation.overall_score) {
          acc[startupId].scores.push(evaluation.overall_score);
          acc[startupId].count += 1;
        }
        return acc;
      }, {} as Record<string, {scores: number[], count: number}>) || {};

      // Combine all data
      const startupsWithStats: StartupWithStats[] = startupsData?.map((startup) => {
        const screeningStat = screeningStats[startup.id] || { scores: [], count: 0 };
        const pitchingStat = pitchingStats[startup.id] || { scores: [], count: 0 };
        
        const screeningAverage = screeningStat.count > 0 
          ? screeningStat.scores.reduce((sum, score) => sum + score, 0) / screeningStat.count 
          : null;
          
        const pitchingAverage = pitchingStat.count > 0 
          ? pitchingStat.scores.reduce((sum, score) => sum + score, 0) / pitchingStat.count 
          : null;

        const allScores = [...screeningStat.scores, ...pitchingStat.scores];
        const overallAverage = allScores.length > 0 
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
          : null;

        return {
          id: startup.id,
          name: startup.name,
          description: startup.description,
          verticals: startup.verticals || [],
          stage: startup.stage,
          regions: startup.regions || [],
          pitch_deck_url: startup.pitch_deck_url,
          demo_url: startup.demo_url,
          contact_email: startup.contact_email,
          founder_names: startup.founder_names || [],
          website: startup.website,
          status: startup.status || 'pending',
          screeningStatus: screeningStatusLookup[startup.id] || null,
          pitchingStatus: pitchingStatusLookup[startup.id] || null,
          screeningStats: {
            averageScore: screeningAverage,
            evaluationCount: screeningStat.count
          },
          pitchingStats: {
            averageScore: pitchingAverage,
            evaluationCount: pitchingStat.count
          },
          overallStats: {
            averageScore: overallAverage,
            totalEvaluations: allScores.length
          }
        };
      }) || [];

      setStartups(startupsWithStats);

    } catch (error: any) {
      console.error('Error fetching startups with stats:', error);
      toast({ title: "Error", description: "Failed to load startup data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSort = useCallback((field: 'name' | 'overallScore' | 'screeningScore' | 'pitchingScore') => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    
    const sortedStartups = [...startups].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          return newOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        case 'overallScore':
          aValue = a.overallStats.averageScore ?? -1;
          bValue = b.overallStats.averageScore ?? -1;
          break;
        case 'screeningScore':
          aValue = a.screeningStats.averageScore ?? -1;
          bValue = b.screeningStats.averageScore ?? -1;
          break;
        case 'pitchingScore':
          aValue = a.pitchingStats.averageScore ?? -1;
          bValue = b.pitchingStats.averageScore ?? -1;
          break;
        default:
          return 0;
      }
      
      return newOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    setStartups(sortedStartups);
  }, [startups, sortBy, sortOrder]);

  useEffect(() => {
    fetchStartupsWithStats();
  }, [fetchStartupsWithStats]);

  // Filter startups based on selected filter
  const filteredStartups = startups.filter(startup => {
    if (filterBy === 'all') return true;
    if (filterBy === 'screening') return startup.screeningStatus !== null;
    if (filterBy === 'pitching') return startup.pitchingStatus !== null;
    return true;
  });

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Startups...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Startups ({startups.length})
          </CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Startups</SelectItem>
                  <SelectItem value="screening">In Screening</SelectItem>
                  <SelectItem value="pitching">In Pitching</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="overallScore">Overall Score</SelectItem>
                  <SelectItem value="screeningScore">Screening Score</SelectItem>
                  <SelectItem value="pitchingScore">Pitching Score</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchStartupsWithStats}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredStartups.map((startup) => (
              <Card key={startup.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-1">{startup.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {startup.stage && (
                          <Badge variant="outline" className="text-xs">
                            {startup.stage}
                          </Badge>
                        )}
                        {startup.verticals.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {startup.verticals[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedForDetails(startup)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {startup.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {startup.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Screening:</span>
                        <div className="flex items-center gap-2">
                          {startup.screeningStats.averageScore ? (
                            <span className={`font-medium ${getScoreColor(startup.screeningStats.averageScore)}`}>
                              {formatScore(startup.screeningStats.averageScore)}/10
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({startup.screeningStats.evaluationCount})
                          </span>
                        </div>
                      </div>
                      {startup.screeningStatus && (
                        <StatusBadge 
                          status={startup.screeningStatus} 
                          roundName="screening" 
                          showRoundContext={false}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pitching:</span>
                        <div className="flex items-center gap-2">
                          {startup.pitchingStats.averageScore ? (
                            <span className={`font-medium ${getScoreColor(startup.pitchingStats.averageScore)}`}>
                              {formatScore(startup.pitchingStats.averageScore)}/10
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({startup.pitchingStats.evaluationCount})
                          </span>
                        </div>
                      </div>
                      {startup.pitchingStatus && (
                        <StatusBadge 
                          status={startup.pitchingStatus} 
                          roundName="pitching" 
                          showRoundContext={false}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Overall:</span>
                      {startup.overallStats.averageScore ? (
                        <span className={`font-medium ${getScoreColor(startup.overallStats.averageScore)}`}>
                          {formatScore(startup.overallStats.averageScore)}/10
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      {startup.overallStats.totalEvaluations} evaluations
                    </div>
                  </div>

                  {startup.website && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      <a 
                        href={startup.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline truncate"
                      >
                        {startup.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStartups.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No startups found</h3>
              <p className="text-muted-foreground">
                {filterBy === 'all' 
                  ? 'No startups are currently available.' 
                  : `No startups found in ${filterBy} round.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedForDetails && (
        <StartupDetailsModal
          startup={selectedForDetails}
          open={!!selectedForDetails}
          onClose={() => setSelectedForDetails(null)}
        />
      )}
    </div>
  );
}