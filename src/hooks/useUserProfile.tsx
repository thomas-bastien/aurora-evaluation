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
  // CM-specific fields
  permissions?: any;
  job_title?: string | null;
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

      // Fetch role from user_roles table
      let role: 'vc' | 'admin' | 'cm' = 'vc'; // default
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roleData) {
        role = roleData.role as 'vc' | 'admin' | 'cm';
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

      // Fetch CM data if user has CM role
      let cmData = null;
      if (role === 'cm') {
        const { data: cm, error: cmError } = await supabase
          .from('community_managers')
          .select('permissions, organization, job_title, linkedin_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cmError) {
          console.error('Error fetching CM data:', cmError);
        } else {
          cmData = cm;
        }
      }

      // Merge profile, juror, and CM data
      const mergedProfile = profileData ? {
        ...profileData,
        role, // Use role from user_roles table
        target_verticals: jurorData?.target_verticals || null,
        preferred_stages: jurorData?.preferred_stages || null,
        preferred_regions: jurorData?.preferred_regions || null,
        calendly_link: jurorData?.calendly_link || cmData?.linkedin_url || null,
        linkedin_url: jurorData?.linkedin_url || cmData?.linkedin_url || null,
        // Legacy fields for backwards compatibility
        expertise: jurorData?.target_verticals || null,
        investment_stages: jurorData?.preferred_stages || null,
        // CM-specific fields
        permissions: cmData?.permissions || null,
        organization: cmData?.organization || profileData.organization,
        job_title: cmData?.job_title || null,
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