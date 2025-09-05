import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { detectDataInconsistencies } from '@/utils/matchmakingUtils';
import { useNavigate } from 'react-router-dom';

interface MatchmakingHealthCardProps {
  className?: string;
}

export function MatchmakingHealthCard({ className }: MatchmakingHealthCardProps) {
  const [healthScore, setHealthScore] = useState<number>(0);
  const [criticalIssues, setCriticalIssues] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkMatchmakingHealth();
  }, []);

  const checkMatchmakingHealth = async () => {
    try {
      setLoading(true);
      
      // Fetch startups and jurors
      const [startupsResponse, jurorsResponse] = await Promise.all([
        supabase.from('startups').select('id, name, verticals, stage, region'),
        supabase.from('jurors').select('id, name, target_verticals, preferred_stages, preferred_regions')
      ]);

      const startups = startupsResponse.data || [];
      const jurors = jurorsResponse.data || [];

      // Detect inconsistencies
      const inconsistencies = detectDataInconsistencies(startups, jurors);
      const highPriorityIssues = inconsistencies.filter(i => i.severity === 'high').length;
      const mediumPriorityIssues = inconsistencies.filter(i => i.severity === 'medium').length;

      // Calculate health score (0-100)
      const totalIssues = inconsistencies.length;
      const weightedIssueScore = (highPriorityIssues * 3) + (mediumPriorityIssues * 2) + (inconsistencies.length - highPriorityIssues - mediumPriorityIssues);
      const maxPossibleIssues = Math.max(startups.length + jurors.length, 10); // Baseline for scoring
      
      let score = Math.max(0, 100 - Math.round((weightedIssueScore / maxPossibleIssues) * 100));
      
      // Boost score if no critical issues
      if (highPriorityIssues === 0 && mediumPriorityIssues === 0) {
        score = Math.max(score, 85);
      }
      
      setHealthScore(score);
      setCriticalIssues(highPriorityIssues + mediumPriorityIssues);
      
    } catch (error) {
      console.error('Error checking matchmaking health:', error);
      setHealthScore(0);
      setCriticalIssues(0);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = () => {
    if (healthScore >= 80) return 'text-success';
    if (healthScore >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthIcon = () => {
    if (healthScore >= 80) return <CheckCircle2 className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getHealthStatus = () => {
    if (healthScore >= 80) return 'Excellent';
    if (healthScore >= 60) return 'Good';
    if (healthScore >= 40) return 'Needs Attention';
    return 'Critical Issues';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-20">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Matchmaking Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={getHealthColor()}>
              {getHealthIcon()}
            </span>
            <div>
              <div className="text-2xl font-bold">{healthScore}%</div>
              <div className="text-xs text-muted-foreground">{getHealthStatus()}</div>
            </div>
          </div>
        </div>

        {/* Critical Issues */}
        {criticalIssues > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Critical Issues</span>
            <Badge variant="destructive" className="text-xs">
              {criticalIssues}
            </Badge>
          </div>
        )}

        {/* Quick Stats */}
        <div className="space-y-2 text-xs text-muted-foreground">
          {healthScore >= 80 && (
            <div className="flex items-center gap-1 text-success">
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready for assignments</span>
            </div>
          )}
          {healthScore < 80 && criticalIssues > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3 h-3" />
              <span>Review data before matching</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/matchmaking')}
          className="w-full"
        >
          <Eye className="w-3 h-3 mr-1" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}