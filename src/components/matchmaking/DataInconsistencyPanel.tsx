import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { detectDataInconsistencies, type DataInconsistency } from '@/utils/matchmakingUtils';

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

interface DataInconsistencyPanelProps {
  startups: Startup[];
  jurors: Juror[];
}

export function DataInconsistencyPanel({ startups, jurors }: DataInconsistencyPanelProps) {
  const inconsistencies = detectDataInconsistencies(startups, jurors);

  if (inconsistencies.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-success">
            <Info className="w-5 h-5" />
            <span className="font-medium">No data inconsistencies detected</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            All startups and jurors have compatible preferences for effective matchmaking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = (severity: DataInconsistency['severity']) => {
    switch (severity) {
      case 'high': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'low': return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: DataInconsistency['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  const groupedInconsistencies = {
    high: inconsistencies.filter(i => i.severity === 'high'),
    medium: inconsistencies.filter(i => i.severity === 'medium'),
    low: inconsistencies.filter(i => i.severity === 'low'),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Data Inconsistencies Detected ({inconsistencies.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Priority Issues */}
        {groupedInconsistencies.high.length > 0 && (
          <div>
            <h4 className="font-semibold text-destructive mb-2">High Priority Issues</h4>
            {groupedInconsistencies.high.map((issue, index) => (
              <Alert key={index} variant="destructive" className="mb-2">
                <AlertDescription>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <p className="font-medium">{issue.message}</p>
                      {issue.items.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {issue.items.slice(0, 5).map(item => (
                            <Badge key={item} variant={getSeverityColor(issue.severity)} className="text-xs">
                              {item}
                            </Badge>
                          ))}
                          {issue.items.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{issue.items.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Medium Priority Issues */}
        {groupedInconsistencies.medium.length > 0 && (
          <div>
            <h4 className="font-semibold text-warning mb-2">Medium Priority Issues</h4>
            {groupedInconsistencies.medium.map((issue, index) => (
              <Alert key={index} className="mb-2">
                <AlertDescription>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <p className="font-medium">{issue.message}</p>
                      {issue.items.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {issue.items.slice(0, 3).map(item => (
                            <Badge key={item} variant={getSeverityColor(issue.severity)} className="text-xs">
                              {item}
                            </Badge>
                          ))}
                          {issue.items.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{issue.items.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Low Priority Issues */}
        {groupedInconsistencies.low.length > 0 && (
          <div>
            <h4 className="font-semibold text-muted-foreground mb-2">Low Priority Issues</h4>
            {groupedInconsistencies.low.map((issue, index) => (
              <div key={index} className="p-3 bg-muted/50 rounded-md mb-2">
                <div className="flex items-start gap-2">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{issue.message}</p>
                    {issue.items.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {issue.items.slice(0, 3).map(item => (
                          <Badge key={item} variant={getSeverityColor(issue.severity)} className="text-xs">
                            {item}
                          </Badge>
                        ))}
                        {issue.items.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{issue.items.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
          <h4 className="font-semibold text-primary mb-2">Recommendations</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Review and update juror preferences to cover all startup verticals</li>
            <li>• Ensure all startups have verticals selected for proper matching</li>
            <li>• Consider adding more jurors with diverse expertise</li>
            <li>• Verify data consistency before confirming assignments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}