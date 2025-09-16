import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './StatusBadge';
import { calculateProgressiveJurorStatus, type ProgressiveJurorStatus, type StatusType } from '@/utils/juryStatusUtils';

interface JurorStatusBadgeProps {
  jurorId: string;
  progressiveStatus?: ProgressiveJurorStatus;
  className?: string;
}

export function JurorStatusBadge({ 
  jurorId, 
  progressiveStatus, 
  className 
}: JurorStatusBadgeProps) {
  const [internalStatus, setInternalStatus] = useState<ProgressiveJurorStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (progressiveStatus) return;
      
      setLoading(true);
      try {
        const statusResult = await calculateProgressiveJurorStatus(jurorId);
        setInternalStatus(statusResult);
      } catch (error) {
        console.error('Error fetching progressive juror status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [jurorId, progressiveStatus]);

  const finalStatus = progressiveStatus || internalStatus;

  if (loading && !finalStatus) {
    return <Skeleton className={`h-6 w-24 ${className || ''}`} />;
  }

  if (!finalStatus) return null;

  return (
    <StatusBadge 
      status={finalStatus.status}
      roundName={finalStatus.currentRound}
      showRoundContext={true}
      className={className}
      isJurorStatus={true}
    />
  );
}