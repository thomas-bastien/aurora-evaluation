import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CohortSettings {
  id: string;
  cohort_name: string;
  screening_deadline: string | null;
  pitching_deadline: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CohortSettingsInput {
  cohort_name: string;
  screening_deadline: string | null;
  pitching_deadline: string | null;
}

/**
 * Hook for managing cohort settings
 */
export const useCohortSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cohort settings
  const {
    data: cohortSettings,
    isLoading,
    error
  } = useQuery({
    queryKey: ['cohort-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohort_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CohortSettings | null;
    }
  });

  // Update cohort settings mutation
  const updateCohortSettings = useMutation({
    mutationFn: async (settings: CohortSettingsInput) => {
      if (cohortSettings?.id) {
        // Update existing settings
        const { data, error } = await supabase
          .from('cohort_settings')
          .update(settings)
          .eq('id', cohortSettings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('cohort_settings')
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort-settings'] });
      toast({
        title: 'Success',
        description: 'Cohort settings updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating cohort settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update cohort settings',
      });
    }
  });

  return {
    cohortSettings,
    isLoading,
    error,
    updateCohortSettings: updateCohortSettings.mutate,
    isUpdating: updateCohortSettings.isPending
  };
};