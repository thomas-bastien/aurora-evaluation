import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';

interface RoundStatusDisplayProps {
  screeningStatus?: 'pending' | 'selected' | 'rejected';
  pitchingStatus?: 'pending' | 'selected' | 'rejected';
  className?: string;
}

export function RoundStatusDisplay({ 
  screeningStatus = 'pending', 
  pitchingStatus = 'pending', 
  className 
}: RoundStatusDisplayProps) {
  return (
    <div className={`space-y-3 ${className || ''}`}>
      <h4 className="font-medium text-foreground">Round Status</h4>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Screening Round:</span>
          <StatusBadge status={screeningStatus} />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Pitching Round:</span>
          <StatusBadge status={pitchingStatus} />
        </div>
      </div>
    </div>
  );
}