import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';

interface UseStartupAssignmentReturn {
  isAssigned: boolean;
  assignmentType: 'screening' | 'pitching' | null;
  loading: boolean;
}

export const useStartupAssignment = (startupId: string): UseStartupAssignmentReturn => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [isAssigned, setIsAssigned] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'screening' | 'pitching' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAssignment = async () => {
      if (!user || !startupId || profile?.role === 'admin') {
        // Admin users can see all evaluations
        if (profile?.role === 'admin') {
          setIsAssigned(true);
          setAssignmentType(null);
        } else {
          setIsAssigned(false);
          setAssignmentType(null);
        }
        setLoading(false);
        return;
      }

      try {
        // First, get the juror record for the current user
        const { data: jurorData, error: jurorError } = await supabase
          .from('jurors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (jurorError && jurorError.code !== 'PGRST116') {
          throw jurorError;
        }

        if (!jurorData) {
          // User doesn't have a juror record, so they're not assigned to anything
          setIsAssigned(false);
          setAssignmentType(null);
          setLoading(false);
          return;
        }

        // Check both screening and pitching assignments using the juror ID
        const [screeningResult, pitchingResult] = await Promise.all([
          supabase
            .from('screening_assignments')
            .select('id')
            .eq('startup_id', startupId)
            .eq('juror_id', jurorData.id)
            .maybeSingle(),
          supabase
            .from('pitching_assignments')
            .select('id')
            .eq('startup_id', startupId)
            .eq('juror_id', jurorData.id)
            .maybeSingle()
        ]);

        if (screeningResult.error && screeningResult.error.code !== 'PGRST116') {
          throw screeningResult.error;
        }
        if (pitchingResult.error && pitchingResult.error.code !== 'PGRST116') {
          throw pitchingResult.error;
        }

        const hasScreeningAssignment = !!screeningResult.data;
        const hasPitchingAssignment = !!pitchingResult.data;

        if (hasScreeningAssignment || hasPitchingAssignment) {
          setIsAssigned(true);
          setAssignmentType(hasScreeningAssignment ? 'screening' : 'pitching');
        } else {
          setIsAssigned(false);
          setAssignmentType(null);
        }
      } catch (error) {
        console.error('Error checking startup assignment:', error);
        setIsAssigned(false);
        setAssignmentType(null);
      } finally {
        setLoading(false);
      }
    };

    checkAssignment();
  }, [user, startupId, profile?.role]);

  return { isAssigned, assignmentType, loading };
};