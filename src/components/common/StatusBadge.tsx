import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusColor, getJurorStatusLabel, type StatusType } from '@/utils/statusUtils';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

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
  
  // Determine icon based on status
  const getStatusIcon = () => {
    const statusStr = String(status).toLowerCase();
    if (statusStr.includes('complete') || statusStr === 'selected' || statusStr === 'submitted') {
      return <CheckCircle className="w-3 h-3 mr-1" />;
    }
    if (statusStr.includes('draft') || statusStr.includes('progress') || statusStr === 'scheduled') {
      return <Clock className="w-3 h-3 mr-1" />;
    }
    if (statusStr.includes('pending') || statusStr === 'not_started' || statusStr === 'rejected') {
      return <AlertCircle className="w-3 h-3 mr-1" />;
    }
    return null;
  };

  return (
    <Badge 
      variant="outline"
      className={`${colorClasses} ${className || ''} flex items-center`}
    >
      {getStatusIcon()}
      {label}
    </Badge>
  );
}