import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Info, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { LucideIcon } from "lucide-react";

type StageStatus = 'upcoming' | 'current' | 'completed' | 'blocked';

interface FunnelStageProps {
  title: string;
  description: string;
  tooltip: string;
  status: StageStatus;
  progress?: number;
  statusText?: string;
  icon: LucideIcon;
  onClick: () => void;
  isLast?: boolean;
}

export const FunnelStage = ({
  title,
  description,
  tooltip,
  status,
  progress,
  statusText,
  icon: Icon,
  onClick,
  isLast = false
}: FunnelStageProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          card: 'bg-success/5 border-success/20 hover:bg-success/10',
          icon: 'bg-success/10 text-success',
          title: 'text-success',
          badge: 'bg-success text-success-foreground'
        };
      case 'current':
        return {
          card: 'bg-primary/5 border-primary/20 hover:bg-primary/10 ring-2 ring-primary/20',
          icon: 'bg-primary/10 text-primary',
          title: 'text-primary',
          badge: 'bg-primary text-primary-foreground'
        };
      case 'blocked':
        return {
          card: 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10',
          icon: 'bg-destructive/10 text-destructive',
          title: 'text-destructive',
          badge: 'bg-destructive text-destructive-foreground'
        };
      default: // upcoming
        return {
          card: 'bg-muted/30 border-border hover:bg-muted/50',
          icon: 'bg-muted text-muted-foreground',
          title: 'text-muted-foreground',
          badge: 'bg-muted text-muted-foreground'
        };
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'current':
        return <Clock className="w-4 h-4" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const styles = getStatusStyles();

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={onClick}
          disabled={status === 'upcoming'}
          className={`p-6 h-auto w-full transition-all duration-200 ${styles.card}`}
        >
          <div className="flex flex-col items-start w-full space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h5 className={`font-semibold ${styles.title}`}>{title}</h5>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
                {getStatusIcon()}
              </div>
            </div>

            {/* Progress */}
            {progress !== undefined && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-xs font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Status */}
            {statusText && (
              <Badge variant="secondary" className={`text-xs ${styles.badge}`}>
                {statusText}
              </Badge>
            )}
          </div>
        </Button>
        
        {/* Arrow connector */}
        {!isLast && (
          <ArrowRight className="w-5 h-5 text-muted-foreground mx-2 flex-shrink-0" />
        )}
      </div>
    </TooltipProvider>
  );
};