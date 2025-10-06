import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  RefreshCw, 
  ArrowRight,
  PlayCircle,
  Send,
  Users,
  BarChart3,
  Calendar,
  Mail,
  CheckCircle2
} from 'lucide-react';

interface QuickAction {
  label: string;
  route: string;
  icon: string;
}

interface AIGuidanceBoxProps {
  guidance: string | null;
  priority: 'high' | 'medium' | 'low';
  quickActions: QuickAction[];
  insights: string[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const iconMap: Record<string, any> = {
  PlayCircle,
  Send,
  Users,
  BarChart3,
  Calendar,
  Mail,
  CheckCircle2,
  ArrowRight
};

const priorityConfig = {
  high: {
    color: 'border-l-destructive',
    badge: 'destructive'
  },
  medium: {
    color: 'border-l-warning',
    badge: 'default'
  },
  low: {
    color: 'border-l-primary',
    badge: 'secondary'
  }
};

export const AIGuidanceBox = ({
  guidance,
  priority,
  quickActions,
  insights,
  loading,
  error,
  onRefresh
}: AIGuidanceBoxProps) => {
  const navigate = useNavigate();

  const handleActionClick = (action: QuickAction, index: number) => {
    // Track click for audit
    console.log('[AI Guidance Click]', {
      timestamp: new Date().toISOString(),
      label: action.label,
      route: action.route,
      priority: priority,
      position: index
    });

    try {
      // Validate route exists
      if (!action.route || action.route === '') {
        throw new Error('Invalid route');
      }

      navigate(action.route);
    } catch (error) {
      console.error('[AI Guidance Navigation Error]', {
        action,
        error
      });
      
      toast({
        variant: 'destructive',
        title: 'Navigation failed',
        description: 'Unable to navigate to this page. Please try another option.'
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-20 w-full mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 mb-6 border-l-4 border-l-muted">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Unable to load guidance. Please refresh to try again.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  const priorityStyles = priorityConfig[priority];

  return (
    <Card className={`p-6 mb-6 border-l-4 ${priorityStyles.color}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Your Next Steps</h3>
          <Badge variant={priorityStyles.badge as any} className="text-xs">
            {priority} priority
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="shrink-0"
          title="Refresh guidance"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Main Guidance */}
        <p className="text-base leading-relaxed">
          {guidance}
        </p>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {insights.map((insight, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {insight}
              </Badge>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickActions.map((action, index) => {
              const Icon = iconMap[action.icon] || ArrowRight;
              return (
                <Button
                  key={index}
                  variant={index === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleActionClick(action, index)}
                  className="gap-2"
                  aria-label={`${action.label} - ${action.route}`}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
