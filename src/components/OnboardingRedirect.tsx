import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

interface OnboardingRedirectProps {
  children: React.ReactNode;
}

const OnboardingRedirect = ({ children }: OnboardingRedirectProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if still loading or no user
    if (authLoading || profileLoading || !user) return;
    
    // Don't redirect if already on onboarding page or auth pages
    if (location.pathname === '/juror-onboarding' || location.pathname === '/auth' || location.pathname === '/') return;
    
    // Check if user needs onboarding
    const needsOnboarding = profile && profile.role === 'vc' && (
      !profile.calendly_link || 
      !profile.expertise || 
      profile.expertise.length === 0 ||
      !profile.investment_stages ||
      profile.investment_stages.length === 0
    );

    if (needsOnboarding) {
      console.log('User needs onboarding, redirecting to /juror-onboarding');
      navigate('/juror-onboarding', { replace: true });
    }
  }, [user, profile, authLoading, profileLoading, location.pathname, navigate]);

  return <>{children}</>;
};

export default OnboardingRedirect;