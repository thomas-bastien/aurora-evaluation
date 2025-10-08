import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useViewMode } from '@/contexts/ViewModeContext';

interface UseStartupAssignmentReturn {
  isAssigned: boolean;
  assignmentType: 'screening' | 'pitching' | null;
  loading: boolean;
}

export const useStartupAssignment = (startupId: string): UseStartupAssignmentReturn => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { viewMode, impersonatedJurorId } = useViewMode();
  const [isAssigned, setIsAssigned] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'screening' | 'pitching' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAssignment = async () => {
      // Early return for non-authenticated users or missing startup ID
      if (!user || !startupId) {
        setIsAssigned(false);
        setAssignmentType(null);
        setLoading(false);
        return;
      }

      // Admin users in admin mode can see all evaluations
      if (profile?.role === 'admin' && viewMode === 'admin') {
        setIsAssigned(true);
        setAssignmentType(null);
        setLoading(false);
        return;
      }

      try {
        // Determine which juror ID to use: impersonated or actual user
        let jurorId: string | null = null;

        if (profile?.role === 'admin' && viewMode === 'juror' && impersonatedJurorId) {
          // Admin is previewing as a juror - use impersonated juror ID
          jurorId = impersonatedJurorId;
        } else {
          // Regular user or admin in admin mode - get juror record for current user
          const { data: jurorData, error: jurorError } = await supabase
            .from('jurors')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (jurorError && jurorError.code !== 'PGRST116') {
            throw jurorError;
          }

          jurorId = jurorData?.id || null;
        }

        if (!jurorId) {
          // No juror record found
          setIsAssigned(false);
          setAssignmentType(null);
          setLoading(false);
          return;
        }

        // Check both screening and pitching assignments using the determined juror ID
        const [screeningResult, pitchingResult] = await Promise.all([
          supabase
            .from('screening_assignments')
            .select('id')
            .eq('startup_id', startupId)
            .eq('juror_id', jurorId)
            .maybeSingle(),
          supabase
            .from('pitching_assignments')
            .select('id')
            .eq('startup_id', startupId)
            .eq('juror_id', jurorId)
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
  }, [user, startupId, profile?.role, viewMode, impersonatedJurorId]);

  return { isAssigned, assignmentType, loading };
};