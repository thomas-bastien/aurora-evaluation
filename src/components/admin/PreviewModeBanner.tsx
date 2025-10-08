import { useViewMode } from '@/contexts/ViewModeContext';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

export const PreviewModeBanner = () => {
  const { isImpersonating, impersonatedJurorName, switchToAdminView } = useViewMode();

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-warning bg-warning/10 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-warning-foreground" />
            <div>
              <p className="text-sm font-semibold text-warning-foreground">
                🔍 Preview Mode - Viewing as {impersonatedJurorName}
              </p>
              <p className="text-xs text-warning-foreground/80">
                You are seeing what this juror sees in their account (read-only)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={switchToAdminView}
            className="flex items-center gap-2 border-warning-foreground/20 hover:bg-warning/20"
          >
            <X className="w-4 h-4" />
            Exit Preview Mode
          </Button>
        </div>
      </div>
    </div>
  );
};
