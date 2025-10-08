import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  organization: string | null;
  role: 'vc' | 'admin' | 'cm';
  created_at: string;
  updated_at: string;
  calendly_link: string | null;
  linkedin_url: string | null;
  // Juror-specific fields (primary)
  target_verticals: string[] | null;
  preferred_stages: string[] | null;
  preferred_regions: string[] | null;
  // Legacy fields (for backwards compatibility)
  expertise: string[] | null;
  investment_stages: string[] | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      const userRole = roleData?.role || 'vc';

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch juror data if profile exists
      let jurorData = null;
      if (profileData) {
        const { data: juror, error: jurorError } = await supabase
          .from('jurors')
          .select('target_verticals, preferred_stages, preferred_regions, calendly_link, linkedin_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (jurorError) {
          console.error('Error fetching juror data:', jurorError);
        } else {
          jurorData = juror;
        }
      }

      // Merge profile and juror data with role from user_roles
      const mergedProfile = profileData ? {
        ...profileData,
        role: userRole,
        target_verticals: jurorData?.target_verticals || null,
        preferred_stages: jurorData?.preferred_stages || null,
        preferred_regions: jurorData?.preferred_regions || null,
        calendly_link: jurorData?.calendly_link || null,
        linkedin_url: jurorData?.linkedin_url || null,
        // Legacy fields for backwards compatibility
        expertise: jurorData?.target_verticals || null,
        investment_stages: jurorData?.preferred_stages || null,
      } : null;

      setProfile(mergedProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    setLoading(true);
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return { profile, loading, refreshProfile };
};