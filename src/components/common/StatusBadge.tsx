import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusColor, type StatusType } from '@/utils/statusUtils';

interface StatusBadgeProps {
  status: StatusType | string;
  roundName?: string;
  showRoundContext?: boolean;
  className?: string;
}

export function StatusBadge({ status, roundName, showRoundContext, className }: StatusBadgeProps) {
  const label = showRoundContext && roundName 
    ? `${getStatusLabel(status)} (${roundName === 'screening' ? 'Screening' : 'Pitching'})`
    : getStatusLabel(status);
    
  const colorClasses = getStatusColor(status);

  return (
    <Badge 
      variant="outline"
      className={`${colorClasses} ${className || ''}`}
    >
      {label}
    </Badge>
  );
}