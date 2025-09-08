import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { type StatusType } from '@/utils/statusUtils';

interface RoundStatusDisplayProps {
  screeningStatus?: StatusType | string;
  pitchingStatus?: StatusType | string;
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
          <StatusBadge status={screeningStatus} roundName="screening" showRoundContext />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Pitching Round:</span>
          <StatusBadge status={pitchingStatus} roundName="pitching" showRoundContext />
        </div>
      </div>
    </div>
  );
}