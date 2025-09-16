import { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import { calculateJuryRoundStatus } from '@/utils/juryStatusUtils';
import type { JuryStatusType } from '@/utils/statusUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface JuryRoundStatusBadgesProps {
  jurorId: string;
  screeningStatus?: JuryStatusType;
  pitchingStatus?: JuryStatusType;
  showRoundLabels?: boolean;
  className?: string;
}

export function JuryRoundStatusBadges({ 
  jurorId, 
  screeningStatus, 
  pitchingStatus, 
  showRoundLabels = true,
  className 
}: JuryRoundStatusBadgesProps) {
  const [screeningStatusState, setScreeningStatusState] = useState<JuryStatusType | null>(screeningStatus || null);
  const [pitchingStatusState, setPitchingStatusState] = useState<JuryStatusType | null>(pitchingStatus || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If statuses are not provided as props, fetch them
    if (!screeningStatus || !pitchingStatus) {
      fetchStatuses();
    }
  }, [jurorId, screeningStatus, pitchingStatus]);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const [screening, pitching] = await Promise.all([
        screeningStatus || calculateJuryRoundStatus(jurorId, 'screening'),
        pitchingStatus || calculateJuryRoundStatus(jurorId, 'pitching')
      ]);

      if (!screeningStatus) setScreeningStatusState(screening);
      if (!pitchingStatus) setPitchingStatusState(pitching);
    } catch (error) {
      console.error('Error fetching jury round statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex gap-2 ${className || ''}`}>
        {showRoundLabels ? (
          <>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </>
        ) : (
          <>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${className || ''}`}>
      {screeningStatusState && (
        <StatusBadge 
          status={screeningStatusState}
          roundName={showRoundLabels ? 'screening' : undefined}
          showRoundContext={showRoundLabels}
        />
      )}
      {pitchingStatusState && (
        <StatusBadge 
          status={pitchingStatusState}
          roundName={showRoundLabels ? 'pitching' : undefined}
          showRoundContext={showRoundLabels}
        />
      )}
    </div>
  );
}