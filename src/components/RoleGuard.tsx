import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useViewMode } from '@/contexts/ViewModeContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'vc' | 'cm')[];
  fallbackRoute?: string;
}

const RoleGuard = ({ children, allowedRoles, fallbackRoute = '/dashboard' }: RoleGuardProps) => {
  const { profile, loading } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { viewMode } = useViewMode();

  useEffect(() => {
    if (!loading && profile) {
      // If admin is in juror preview mode and the route is for VCs, allow access
      const effectiveRole = viewMode === 'juror' && profile.role === 'admin' 
        ? 'vc' 
        : profile.role;

      if (!allowedRoles.includes(effectiveRole)) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive"
        });
        navigate(fallbackRoute, { replace: true });
      }
    }
  }, [profile, loading, allowedRoles, navigate, fallbackRoute, toast, viewMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Check effective role (considering view mode)
  const effectiveRole = viewMode === 'juror' && profile.role === 'admin' 
    ? 'vc' 
    : profile.role;

  if (!allowedRoles.includes(effectiveRole)) {
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;