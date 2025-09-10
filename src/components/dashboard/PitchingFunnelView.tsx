import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Network,
  Phone, 
  Star,
  TrendingUp,
  FileText,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { getPitchingFunnelData } from "@/utils/pitchingFunnelUtils";
import { toast } from "sonner";

interface PitchingFunnelViewProps {
  isActive?: boolean;
}

interface FunnelStepData {
  title: string;
  description: string;
  numerator: number;
  denominator: number;
  percentage: number;
  route: string;
  status: 'completed' | 'in-progress' | 'pending';
}

const stepIcons = [Network, Phone, Star, TrendingUp, FileText];

const getStatusColor = (status: FunnelStepData['status']) => {
  switch (status) {
    case 'completed': return 'text-green-600';
    case 'in-progress': return 'text-blue-600';
    case 'pending': return 'text-gray-400';
    default: return 'text-gray-400';
  }
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return 'bg-green-600';
  if (percentage >= 40) return 'bg-blue-600';
  return 'bg-gray-300';
};

const stepTooltips = [
  "Completion rate = proportion of Pitching startups that already have at least 3 evaluations submitted compared to the total Pitching cohort.",
  "Currently mirrors Pitching Evaluations completion until Pitching Call data is integrated.",
  "Shows progress of Pitching evaluations submitted compared to the total assigned in Pitching.",
  "Completion rate = proportion of Pitching startups marked as Finalists compared to the total Pitching cohort.",
  "Completion rate = proportion of Pitching startups that have been sent their results and feedback compared to the total Pitching cohort."
];

export function PitchingFunnelView({ isActive = false }: PitchingFunnelViewProps) {
  const [funnelData, setFunnelData] = useState<FunnelStepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchFunnelData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPitchingFunnelData();
      setFunnelData(data);
    } catch (error) {
      console.error('Error fetching pitching funnel data:', error);
      setError('Failed to load funnel data');
      toast.error('Failed to load pitching funnel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const handleStepClick = (route: string) => {
    if (isActive) {
      navigate(route);
    }
  };

  const handleRefresh = () => {
    fetchFunnelData();
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Round 2</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  Pitching Round
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {funnelData.map((step, index) => {
            const Icon = stepIcons[index];
            const hasProgress = step.percentage > 0 || step.denominator > 0;
            
            return (
              <div key={index} className="flex items-center space-x-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`flex-1 justify-start p-4 h-auto ${
                        isActive && hasProgress ? 'cursor-pointer hover:bg-accent' : 'cursor-default'
                      }`}
                      onClick={() => handleStepClick(step.route)}
                      disabled={!isActive || !hasProgress}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Icon className={`h-5 w-5 flex-shrink-0 ${getStatusColor(step.status)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-left">{step.title}</h4>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                {step.numerator}/{step.denominator}
                              </div>
                              <div className="text-lg font-semibold">
                                {step.percentage}%
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground text-left mb-2">
                            {step.description}
                          </p>
                          <div className="w-full">
                            <Progress 
                              value={step.percentage} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>{stepTooltips[index]}</p>
                  </TooltipContent>
                </Tooltip>
                {index < funnelData.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}