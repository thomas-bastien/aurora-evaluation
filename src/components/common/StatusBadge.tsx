import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusColor, getJuryStatusLabel, getJuryStatusColor, type StatusType, type JuryStatusType } from '@/utils/statusUtils';

interface StatusBadgeProps {
  status: StatusType | JuryStatusType | string;
  roundName?: string;
  showRoundContext?: boolean;
  className?: string;
  isJuryStatus?: boolean;
}

export function StatusBadge({ status, roundName, showRoundContext, className, isJuryStatus }: StatusBadgeProps) {
  // Determine if this is a jury status based on prop or status value
  const isJury = isJuryStatus || ['inactive', 'not_started', 'in_progress', 'completed'].includes(status);
  
  const baseLabel = isJury ? getJuryStatusLabel(status) : getStatusLabel(status);
  const label = showRoundContext && roundName 
    ? `${baseLabel} (${roundName === 'screening' ? 'Screening' : 'Pitching'})`
    : baseLabel;
    
  const colorClasses = isJury ? getJuryStatusColor(status) : getStatusColor(status);

  return (
    <Badge 
      variant="outline"
      className={`${colorClasses} ${className || ''}`}
    >
      {label}
    </Badge>
  );
}