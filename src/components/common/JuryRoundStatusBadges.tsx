import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { calculateProgressiveJurorStatus, calculateJurorRoundStatus, type ProgressiveJurorStatus, type UnifiedJurorStatus } from '@/utils/juryStatusUtils';

interface JurorStatusBadgeProps {
  jurorId: string;
  progressiveStatus?: ProgressiveJurorStatus;
  roundName?: 'screening' | 'pitching';
  className?: string;
}

export function JurorStatusBadge({ 
  jurorId, 
  progressiveStatus,
  roundName,
  className 
}: JurorStatusBadgeProps) {
  const [internalStatus, setInternalStatus] = useState<ProgressiveJurorStatus | null>(null);
  const [roundStatus, setRoundStatus] = useState<UnifiedJurorStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (progressiveStatus && !roundName) return;
      
      setLoading(true);
      try {
        if (roundName) {
          // Use round-specific status for accurate per-round display
          const roundStatusResult = await calculateJurorRoundStatus(jurorId, roundName);
          setRoundStatus(roundStatusResult);
        } else {
          // Use progressive status for cross-round display
          const statusResult = await calculateProgressiveJurorStatus(jurorId);
          setInternalStatus(statusResult);
        }
      } catch (error) {
        console.error('Error fetching juror status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [jurorId, progressiveStatus, roundName]);

  if (loading && !progressiveStatus && !roundStatus) {
    return <Skeleton className={`h-6 w-24 ${className || ''}`} />;
  }

  // If we have a specific round, use round-specific status display
  if (roundName && roundStatus) {
    return (
      <Badge 
        variant="outline"
        className={`${getUnifiedStatusColor(roundStatus)} ${className || ''}`}
      >
        {getUnifiedStatusLabel(roundStatus, roundName)}
      </Badge>
    );
  }

  // Otherwise use progressive status
  const finalStatus = progressiveStatus || internalStatus;
  if (!finalStatus) return null;

  return (
    <Badge 
      variant="outline"
      className={`${getUnifiedStatusColor(finalStatus.status)} ${className || ''}`}
    >
      {getUnifiedStatusLabel(finalStatus.status, finalStatus.currentRound)}
    </Badge>
  );
}

// Unified helper functions for status display
function getUnifiedStatusLabel(status: UnifiedJurorStatus, roundName?: string): string {
  const roundContext = roundName ? ` (${roundName === 'screening' ? 'Screening' : 'Pitching'})` : '';
  
  switch (status) {
    case 'completed':
      return `Completed${roundContext}`;
    case 'active':
      return `In Progress${roundContext}`;
    case 'pending':
      return `Pending${roundContext}`;
    case 'not_invited':
      return 'Not Invited';
    default:
      return 'Unknown';
  }
}

function getUnifiedStatusColor(status: UnifiedJurorStatus): string {
  switch (status) {
    case 'completed':
      return 'text-success border-success';
    case 'active':
      return 'text-primary border-primary';
    case 'pending':
      return 'text-warning border-warning';
    case 'not_invited':
      return 'text-muted-foreground border-muted-foreground';
    default:
      return 'text-foreground border-border';
  }
}