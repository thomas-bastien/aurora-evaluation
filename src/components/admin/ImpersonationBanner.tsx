import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedJurorName, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate('/jurors');
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-warning/90 backdrop-blur-sm border-b border-warning-foreground/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-warning-foreground" />
            <div>
              <p className="text-sm font-semibold text-warning-foreground">
                🔍 Viewing as {impersonatedJurorName}
              </p>
              <p className="text-xs text-warning-foreground/80">
                Read-Only Mode - You cannot save or modify data while viewing as a juror
              </p>
            </div>
          </div>
          <Button
            onClick={handleExit}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-background hover:bg-background/90"
          >
            <X className="w-4 h-4" />
            Exit View Mode
          </Button>
        </div>
      </div>
    </div>
  );
};
