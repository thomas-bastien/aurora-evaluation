import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface Startup {
  id: string;
  name: string;
  verticals?: string[];
  stage?: string;
  region?: string;
}

interface Juror {
  id: string;
  name: string;
  target_verticals?: string[];
  preferred_stages?: string[];
  preferred_regions?: string[];
}

interface CompatibilityProps {
  startup: Startup;
  juror: Juror;
}

export function MatchmakingCompatibility({ startup, juror }: CompatibilityProps) {
  // Check vertical alignment
  const startupVerticals = startup.verticals || [];
  const jurorVerticals = juror.target_verticals || [];
  const verticalMatches = startupVerticals.filter(v => jurorVerticals.includes(v));
  const hasVerticalMatch = verticalMatches.length > 0;

  // Check stage alignment
  const startupStage = startup.stage;
  const jurorStages = juror.preferred_stages || [];
  const hasStageMatch = startupStage ? jurorStages.includes(startupStage) : false;

  // Check region alignment  
  const startupRegion = startup.region;
  const jurorRegions = juror.preferred_regions || [];
  const hasRegionMatch = startupRegion ? jurorRegions.includes(startupRegion) : false;

  // Calculate overall compatibility score
  const compatibilityScore = [hasVerticalMatch, hasStageMatch, hasRegionMatch].filter(Boolean).length;
  const totalCriteria = 3;
  const compatibilityPercentage = (compatibilityScore / totalCriteria) * 100;

  const getCompatibilityColor = () => {
    if (compatibilityPercentage >= 67) return 'text-success';
    if (compatibilityPercentage >= 33) return 'text-warning';
    return 'text-destructive';
  };

  const getCompatibilityIcon = () => {
    if (compatibilityPercentage >= 67) return <CheckCircle2 className="w-4 h-4" />;
    if (compatibilityPercentage >= 33) return <AlertTriangle className="w-4 h-4" />;
    return <X className="w-4 h-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className={getCompatibilityColor()}>
            {getCompatibilityIcon()}
          </span>
          Matchmaking Compatibility ({Math.round(compatibilityPercentage)}%)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Vertical Match */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Vertical Match</span>
          <div className="flex items-center gap-2">
            {hasVerticalMatch ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <X className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">
              {verticalMatches.length} match{verticalMatches.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
        
        {verticalMatches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {verticalMatches.map(vertical => (
              <Badge key={vertical} variant="secondary" className="text-xs">
                {vertical}
              </Badge>
            ))}
          </div>
        )}

        {/* Stage Match */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Stage Match</span>
          <div className="flex items-center gap-2">
            {hasStageMatch ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <X className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">
              {startupStage || 'Not specified'}
            </span>
          </div>
        </div>

        {/* Region Match */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Region Match</span>
          <div className="flex items-center gap-2">
            {hasRegionMatch ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <X className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">
              {startupRegion || 'Not specified'}
            </span>
          </div>
        </div>

        {/* Compatibility Issues Warning */}
        {compatibilityPercentage < 33 && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">Low Compatibility</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This juror may not be well-suited for this startup based on their preferences.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}