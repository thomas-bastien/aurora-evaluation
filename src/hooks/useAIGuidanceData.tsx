import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';

interface QuickAction {
  label: string;
  route: string;
  icon: string;
}

interface GuidanceData {
  guidance: string;
  priority: 'high' | 'medium' | 'low';
  quickActions: QuickAction[];
  insights: string[];
}

interface GuidanceResult {
  data: GuidanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAIGuidanceData = (activeRoundName?: string): GuidanceResult => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [data, setData] = useState<GuidanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuidance = async () => {
    if (!user || !profile || !activeRoundName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check database cache first
      const { data: cached } = await supabase
        .from('ai_guidance_cache')
        .select('guidance_data, computed_at')
        .eq('user_id', user.id)
        .eq('role', profile.role)
        .eq('round_name', activeRoundName)
        .maybeSingle();

      if (cached) {
        setData(cached.guidance_data as unknown as GuidanceData);
        setLoading(false);
        return;
      }

      // Cache miss - fetch metrics and generate new guidance

      let metrics = {};

      if (profile.role === 'vc') {
        // Fetch juror-specific metrics
        const { data: jurorData } = await supabase
          .from('jurors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (jurorData) {
          // Get assignments
          const assignmentTable = activeRoundName === 'screening' 
            ? 'screening_assignments' 
            : 'pitching_assignments';
          
          const { data: assignments } = await supabase
            .from(assignmentTable)
            .select('id, startup_id')
            .eq('juror_id', jurorData.id)
            .eq('status', 'assigned');

          // Get evaluations
          const evaluationTable = activeRoundName === 'screening'
            ? 'screening_evaluations'
            : 'pitching_evaluations';

          const { data: evaluations } = await supabase
            .from(evaluationTable)
            .select('status')
            .eq('evaluator_id', user.id);

          const completed = evaluations?.filter(e => e.status === 'submitted').length || 0;
          const draft = evaluations?.filter(e => e.status === 'draft').length || 0;
          const assigned = assignments?.length || 0;
          const pending = assigned - completed - draft;

          metrics = {
            assignedStartups: assigned,
            completedEvaluations: completed,
            draftEvaluations: draft,
            pendingEvaluations: Math.max(0, pending)
          };
        }
      } else if (profile.role === 'admin') {
        // Fetch CM-specific metrics
        const assignmentTable = activeRoundName === 'screening' 
          ? 'screening_assignments' 
          : 'pitching_assignments';
        
        const evaluationTable = activeRoundName === 'screening'
          ? 'screening_evaluations'
          : 'pitching_evaluations';

        const [
          { count: totalStartups },
          { count: totalJurors },
          { data: assignments },
          { data: evaluations },
          { count: pendingComms },
          { data: activeJurors }
        ] = await Promise.all([
          supabase.from('startups').select('*', { count: 'exact', head: true }),
          supabase.from('jurors').select('*', { count: 'exact', head: true }),
          supabase.from(assignmentTable).select('id').eq('status', 'assigned'),
          supabase.from(evaluationTable).select('status'),
          supabase.from('email_communications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('jurors').select('id').not('user_id', 'is', null)
        ]);

        const totalAssignments = assignments?.length || 0;
        const completedEvals = evaluations?.filter(e => e.status === 'submitted').length || 0;
        const completionRate = totalAssignments > 0 
          ? Math.round((completedEvals / totalAssignments) * 100) 
          : 0;

        // Get unscheduled pitch calls (pitching round only)
        let unscheduledPitches = 0;
        if (activeRoundName === 'pitching') {
          const { data: pitchAssignments } = await supabase
            .from('pitching_assignments')
            .select('meeting_scheduled_date')
            .eq('status', 'assigned');
          
          unscheduledPitches = pitchAssignments?.filter(p => !p.meeting_scheduled_date).length || 0;
        }

        metrics = {
          totalStartups: totalStartups || 0,
          totalJurors: totalJurors || 0,
          completionRate,
          pendingCommunications: pendingComms || 0,
          unscheduledPitches,
          activeJurors: activeJurors?.length || 0
        };
      }

      // Call edge function
      const { data: guidanceResponse, error: functionError } = await supabase.functions.invoke(
        'generate-ai-guidance',
        {
          body: {
            role: profile.role,
            userName: profile.full_name || 'there',
            roundName: activeRoundName,
            metrics
          }
        }
      );

      if (functionError) throw functionError;

      const guidanceData = guidanceResponse as GuidanceData;
      
      // Store in database cache
      await supabase
        .from('ai_guidance_cache')
        .upsert([{
          user_id: user.id,
          role: profile.role,
          round_name: activeRoundName,
          guidance_data: guidanceData as any,
          metrics_snapshot: metrics as any
        }]);

      setData(guidanceData);
    } catch (err) {
      console.error('Error fetching AI guidance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guidance');
      
      // Fallback guidance
      setData({
        guidance: 'Welcome back! Check your dashboard for the latest updates.',
        priority: 'medium',
        quickActions: [],
        insights: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidance();
  }, [user?.id, profile?.role, activeRoundName]);

  return {
    data,
    loading,
    error,
    refetch: fetchGuidance
  };
};
