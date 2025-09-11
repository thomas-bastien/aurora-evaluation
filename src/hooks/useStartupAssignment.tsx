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
        // Check both screening and pitching assignments
        const [screeningResult, pitchingResult] = await Promise.all([
          supabase
            .from('screening_assignments')
            .select('id')
            .eq('startup_id', startupId)
            .eq('juror_id', user.id)
            .maybeSingle(),
          supabase
            .from('pitching_assignments')
            .select('id')
            .eq('startup_id', startupId)
            .eq('juror_id', user.id)
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