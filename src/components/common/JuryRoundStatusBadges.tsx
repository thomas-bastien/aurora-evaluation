import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './StatusBadge';
import { calculateJurorStatus, type StatusType } from '@/utils/juryStatusUtils';

interface JurorStatusBadgeProps {
  jurorId: string;
  status?: StatusType;
  showCurrentRound?: boolean;
  className?: string;
}

export function JurorStatusBadge({ 
  jurorId, 
  status, 
  showCurrentRound = false, 
  className 
}: JurorStatusBadgeProps) {
  const [internalStatus, setInternalStatus] = useState<StatusType | null>(null);
  const [currentRound, setCurrentRound] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (status) return;
      
      setLoading(true);
      try {
        // Get current round info if needed
        if (showCurrentRound) {
          const { data: activeRound } = await supabase
            .from('rounds')
            .select('name')
            .eq('status', 'active')
            .single();
          setCurrentRound(activeRound?.name || null);
        }
        
        const statusResult = await calculateJurorStatus(jurorId);
        setInternalStatus(statusResult);
      } catch (error) {
        console.error('Error fetching juror status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [jurorId, status, showCurrentRound]);

  const finalStatus = status || internalStatus;

  if (loading && !finalStatus) {
    return <Skeleton className={`h-6 w-20 ${className || ''}`} />;
  }

  if (!finalStatus) return null;

  return (
    <StatusBadge 
      status={finalStatus}
      roundName={showCurrentRound ? currentRound : undefined}
      showRoundContext={showCurrentRound}
      className={className}
      isJurorStatus={true}
    />
  );
}