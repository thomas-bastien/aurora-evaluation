import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ResetCohortParams {
  cohortId: string;
  cohortName: string;
}

export const useCohortReset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetCohort = useMutation({
    mutationFn: async ({ cohortId, cohortName }: ResetCohortParams) => {
      const { data, error } = await supabase.functions.invoke('reset-cohort-data', {
        body: { cohortId, cohortName }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['startups'] });
      queryClient.invalidateQueries({ queryKey: ['jurors'] });
      queryClient.invalidateQueries({ queryKey: ['screening-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['pitching-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['screening-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['pitching-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['email-communications'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['rounds'] });

      toast({
        title: 'Cohort Reset Complete',
        description: `Successfully deleted ${Object.values(data.recordsDeleted || {}).reduce((a: number, b: number) => a + b, 0)} records.`,
      });
    },
    onError: (error: any) => {
      console.error('Cohort reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error.message || 'Failed to reset cohort data. Please try again.',
      });
    }
  });

  return {
    resetCohort: resetCohort.mutate,
    isResetting: resetCohort.isPending,
    isSuccess: resetCohort.isSuccess,
    isError: resetCohort.isError,
  };
};
