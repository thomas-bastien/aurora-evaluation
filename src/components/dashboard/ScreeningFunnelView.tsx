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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">Round 1</Badge>
            Screening Round
          </CardTitle>
          <CardDescription>
            Initial evaluation and selection of startups for pitching round
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">Round 1</Badge>
                Screening Round
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">Round 1</Badge>
                Screening Round
              </CardTitle>
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
                variant={isActive ? 'default' : 'outline'}
                className="px-3 py-1"
              >
                {isActive ? 'Active' : 'Upcoming'}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {funnelData.map((step, index) => {
              const IconComponent = STEP_ICONS[index];
              const isClickable = isActive && step.percentage > 0;
              
              return (
                <div key={index} className="flex items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`flex-1 h-auto p-4 justify-start ${
                          isClickable 
                            ? 'hover:bg-accent cursor-pointer' 
                            : 'cursor-default opacity-75'
                        }`}
                        onClick={() => isClickable && handleStepClick(step.route)}
                        disabled={!isClickable}
                      >
                        <div className="flex items-center gap-4 w-full">
                          {/* Step Icon */}
                          <div className={`p-2 rounded-full ${getStatusColor(step.status)}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          
                          {/* Step Content */}
                          <div className="flex-1 text-left">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{step.title}</h4>
                              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${
                                step.status === 'completed' ? 'bg-green-100 text-green-800' :
                                step.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {getStatusIcon(step.status)}
                                {step.percentage.toFixed(0)}%
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">{step.description}</p>
                              
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={step.percentage} 
                                  className="flex-1 h-2"
                                />
                                <span className="text-xs text-muted-foreground min-w-fit">
                                  {step.numerator}/{step.denominator}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-80">
                      <p>{step.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Arrow between steps (except last step) */}
                  {index < funnelData.length - 1 && (
                    <div className="flex items-center">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};