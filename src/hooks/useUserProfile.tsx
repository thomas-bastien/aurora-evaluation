import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/hooks/useImpersonation';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  organization: string | null;
  role: 'vc' | 'admin';
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
  const { isImpersonating, impersonatedJurorId } = useImpersonation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setOriginalProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Always fetch admin's original profile first
      const { data: adminProfileData, error: adminProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminProfileError) {
        console.error('Error fetching admin profile:', adminProfileError);
        setProfile(null);
        setOriginalProfile(null);
        setLoading(false);
        return;
      }

      // Store original admin profile
      const adminMergedProfile = adminProfileData ? {
        ...adminProfileData,
        target_verticals: null,
        preferred_stages: null,
        preferred_regions: null,
        calendly_link: null,
        linkedin_url: null,
        expertise: null,
        investment_stages: null,
      } : null;

      setOriginalProfile(adminMergedProfile);

      // If impersonating, fetch impersonated juror's data
      if (isImpersonating && impersonatedJurorId) {
        const { data: jurorData, error: jurorError } = await supabase
          .from('jurors')
          .select('id, name, email, user_id, target_verticals, preferred_stages, preferred_regions, calendly_link, linkedin_url, company')
          .eq('id', impersonatedJurorId)
          .maybeSingle();

        if (jurorError) {
          console.error('Error fetching impersonated juror data:', jurorError);
          setProfile(adminMergedProfile);
          setLoading(false);
          return;
        }

        if (!jurorData) {
          console.error('Impersonated juror not found');
          setProfile(adminMergedProfile);
          setLoading(false);
          return;
        }

        // If juror has accepted invitation (has user_id), fetch their profile
        let jurorProfileData = null;
        if (jurorData.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', jurorData.user_id)
            .maybeSingle();
          
          jurorProfileData = profile;
        }

        // Create impersonated profile (use juror's profile if exists, otherwise construct from juror data)
        const impersonatedProfile = jurorProfileData ? {
          ...jurorProfileData,
          target_verticals: jurorData.target_verticals || null,
          preferred_stages: jurorData.preferred_stages || null,
          preferred_regions: jurorData.preferred_regions || null,
          calendly_link: jurorData.calendly_link || null,
          linkedin_url: jurorData.linkedin_url || null,
          expertise: jurorData.target_verticals || null,
          investment_stages: jurorData.preferred_stages || null,
        } : {
          id: jurorData.id,
          user_id: jurorData.user_id || '',
          full_name: jurorData.name,
          organization: jurorData.company,
          role: 'vc' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          calendly_link: jurorData.calendly_link || null,
          linkedin_url: jurorData.linkedin_url || null,
          target_verticals: jurorData.target_verticals || null,
          preferred_stages: jurorData.preferred_stages || null,
          preferred_regions: jurorData.preferred_regions || null,
          expertise: jurorData.target_verticals || null,
          investment_stages: jurorData.preferred_stages || null,
        };

        setProfile(impersonatedProfile);
      } else {
        // Not impersonating, fetch admin's own juror data if exists
        const { data: juror, error: jurorError } = await supabase
          .from('jurors')
          .select('target_verticals, preferred_stages, preferred_regions, calendly_link, linkedin_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (jurorError) {
          console.error('Error fetching juror data:', jurorError);
        }

        const mergedProfile = adminProfileData ? {
          ...adminProfileData,
          target_verticals: juror?.target_verticals || null,
          preferred_stages: juror?.preferred_stages || null,
          preferred_regions: juror?.preferred_regions || null,
          calendly_link: juror?.calendly_link || null,
          linkedin_url: juror?.linkedin_url || null,
          expertise: juror?.target_verticals || null,
          investment_stages: juror?.preferred_stages || null,
        } : null;

        setProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setOriginalProfile(null);
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
  }, [user, isImpersonating, impersonatedJurorId]);

  return { 
    profile, 
    originalProfile, 
    loading, 
    refreshProfile, 
    isImpersonating 
  };
};