import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle } from "lucide-react";

interface PitchingCall {
  id: string;
  startup_name: string;
  pitch_date: string | null;
  status: 'pending' | 'scheduled' | 'completed';
  meeting_notes?: string;
}

interface PitchingCallsListProps {
  jurorId: string;
  jurorUserId: string;
}

export function PitchingCallsList({ jurorId, jurorUserId }: PitchingCallsListProps) {
  const [pitchingCalls, setPitchingCalls] = useState<PitchingCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPitchingCalls();
  }, [jurorId, jurorUserId]);

  const fetchPitchingCalls = async () => {
    try {
      if (!jurorUserId) {
        setPitchingCalls([]);
        return;
      }

      // Fetch pitch requests for this VC/juror
      const { data: pitchRequests, error: pitchError } = await supabase
        .from('pitch_requests')
        .select(`
          id,
          startup_id,
          pitch_date,
          status,
          meeting_notes,
          startups (
            name
          )
        `)
        .eq('vc_id', jurorUserId);

      if (pitchError) throw pitchError;

      // Also fetch pitching assignments to get assigned startups
      const { data: assignments, error: assignError } = await supabase
        .from('pitching_assignments')
        .select(`
          startup_id,
          status,
          meeting_scheduled_date,
          meeting_completed_date,
          startups (
            name
          )
        `)
        .eq('juror_id', jurorId);

      if (assignError) throw assignError;

      // Combine data: prioritize pitch_requests, then fill in from assignments
      const callsMap = new Map<string, PitchingCall>();

      // Add from pitch requests first
      pitchRequests?.forEach(request => {
        callsMap.set(request.startup_id, {
          id: request.id,
          startup_name: request.startups?.name || 'Unknown Startup',
          pitch_date: request.pitch_date,
          status: request.status as 'pending' | 'scheduled' | 'completed',
          meeting_notes: request.meeting_notes
        });
      });

      // Add assignments that don't have pitch requests
      assignments?.forEach(assignment => {
        if (!callsMap.has(assignment.startup_id)) {
          let status: 'pending' | 'scheduled' | 'completed' = 'pending';
          let pitch_date = null;

          if (assignment.meeting_completed_date) {
            status = 'completed';
            pitch_date = assignment.meeting_completed_date;
          } else if (assignment.meeting_scheduled_date) {
            status = 'scheduled';
            pitch_date = assignment.meeting_scheduled_date;
          }

          callsMap.set(assignment.startup_id, {
            id: assignment.startup_id,
            startup_name: assignment.startups?.name || 'Unknown Startup',
            pitch_date,
            status,
          });
        }
      });

      setPitchingCalls(Array.from(callsMap.values()));
    } catch (error) {
      console.error('Error fetching pitching calls:', error);
      setPitchingCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-success" />;
      case 'scheduled':
        return <Calendar className="w-3 h-3 text-primary" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'scheduled':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading || pitchingCalls.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {pitchingCalls.map((call) => (
        <div key={call.id} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
          <div className="flex items-center gap-2">
            {getStatusIcon(call.status)}
            <span className="truncate max-w-[120px]" title={call.startup_name}>
              {call.startup_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {call.pitch_date && (
              <span className="text-muted-foreground">
                {new Date(call.pitch_date).toLocaleDateString()}
              </span>
            )}
            <Badge variant={getStatusVariant(call.status)} className="text-xs">
              {call.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}