import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusColor, getJurorStatusLabel, type StatusType } from '@/utils/statusUtils';

interface StatusBadgeProps {
  status: StatusType | string;
  roundName?: string;
  showRoundContext?: boolean;
  className?: string;
  isJurorStatus?: boolean;
}

export function StatusBadge({ status, roundName, showRoundContext, className, isJurorStatus }: StatusBadgeProps) {
  const baseLabel = isJurorStatus ? getJurorStatusLabel(status as StatusType) : getStatusLabel(status);
  const label = showRoundContext && roundName 
    ? `${baseLabel} (${roundName === 'screening' ? 'Screening' : 'Pitching'})`
    : baseLabel;
    
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