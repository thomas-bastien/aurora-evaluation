import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Upload, 
  UserCheck, 
  ClipboardList, 
  Filter, 
  Mail,
  ArrowRight,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { getScreeningFunnelData, type FunnelStepData } from "@/utils/screeningFunnelUtils";
import { useToast } from "@/hooks/use-toast";

interface ScreeningFunnelViewProps {
  isActive?: boolean;
  deadlineInfo?: string;
}

const STEP_ICONS = [Upload, UserCheck, ClipboardList, Filter, Mail];

const getStatusColor = (status: FunnelStepData['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-600';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-600';
    case 'pending':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getStatusIcon = (status: FunnelStepData['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-3 h-3" />;
    case 'in-progress':
      return <Clock className="w-3 h-3" />;
    case 'pending':
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <AlertCircle className="w-3 h-3" />;
  }
};

export const ScreeningFunnelView = ({ isActive = true, deadlineInfo }: ScreeningFunnelViewProps) => {
  const [funnelData, setFunnelData] = useState<FunnelStepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchFunnelData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getScreeningFunnelData();
      setFunnelData(data);
    } catch (error: any) {
      console.error('Error fetching funnel data:', error);
      setError('Failed to load funnel data');
      toast({
        title: "Error",
        description: "Failed to load screening funnel data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const handleStepClick = (route: string) => {
    if (!isActive) return;
    navigate(route);
  };

  const handleRefresh = () => {
    fetchFunnelData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Funnel</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-xl">Screening Round</CardTitle>
                  <Badge className="bg-cyan-100 text-cyan-800 px-3 py-1">
                    Round 1
                  </Badge>
                </div>
                <CardDescription>
                  Initial evaluation and selection of startups for pitching round
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {deadlineInfo && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{deadlineInfo}</span>
                  </div>
                )}
                <Badge 
                  className={isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}
                >
                  {isActive ? 'Active' : 'Upcoming'}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Overall Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Track completion across all funnel stages
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(funnelData.reduce((sum, step) => sum + step.percentage, 0) / funnelData.length)}%
                </div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
            <Progress 
              value={funnelData.reduce((sum, step) => sum + step.percentage, 0) / funnelData.length} 
              className="h-2"
              variant="gradient"
            />
          </CardContent>
        </Card>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {funnelData.map((step, index) => {
            const IconComponent = STEP_ICONS[index];
            const isClickable = isActive && step.route;
            
            return (
              <Tooltip key={step.title}>
                <TooltipTrigger asChild>
                  <Card 
                    className={`hover:shadow-md transition-shadow ${isClickable ? 'cursor-pointer' : ''}`}
                    onClick={() => isClickable && handleStepClick(step.route!)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 rounded-lg bg-cyan-50 flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-base">{step.title}</h4>
                            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-600 text-white px-3 py-1 text-sm font-medium">
                          {step.numerator} of {step.denominator} ({Math.round(step.percentage)}%)
                        </Badge>
                      </div>
                      <Progress value={step.percentage} className="h-2" variant="gradient" />
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};