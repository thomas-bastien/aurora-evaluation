import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from '@/components/common/StatusBadge';
import { getJuryAssignmentCounts } from '@/utils/juryStatusUtils';
import type { JuryStatusType } from '@/utils/statusUtils';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

interface RoundProgressTabProps {
  jurorId: string;
  screeningStatus: JuryStatusType;
  pitchingStatus: JuryStatusType;
}

interface RoundProgressData {
  assigned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

export function RoundProgressTab({ jurorId, screeningStatus, pitchingStatus }: RoundProgressTabProps) {
  const [screeningData, setScreeningData] = useState<RoundProgressData | null>(null);
  const [pitchingData, setPitchingData] = useState<RoundProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoundProgress();
  }, [jurorId]);

  const fetchRoundProgress = async () => {
    try {
      const [screening, pitching] = await Promise.all([
        getJuryAssignmentCounts(jurorId, 'screening'),
        getJuryAssignmentCounts(jurorId, 'pitching')
      ]);

      setScreeningData(screening);
      setPitchingData(pitching);
    } catch (error) {
      console.error('Error fetching round progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (data: RoundProgressData | null) => {
    if (!data || data.assigned === 0) return 0;
    return Math.round((data.completed / data.assigned) * 100);
  };

  const getStatusIcon = (status: JuryStatusType) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'not_started':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Screening Round Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(screeningStatus)}
            Screening Round
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <StatusBadge status={screeningStatus} isJurorStatus={true} />
          </div>
          
          {screeningData && screeningData.assigned > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{getProgressPercentage(screeningData)}%</span>
                </div>
                <Progress value={getProgressPercentage(screeningData)} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned:</span>
                  <span className="font-medium">{screeningData.assigned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium text-green-600">{screeningData.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Progress:</span>
                  <span className="font-medium text-blue-600">{screeningData.inProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Not Started:</span>
                  <span className="font-medium text-yellow-600">{screeningData.notStarted}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No assignments in this round</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pitching Round Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(pitchingStatus)}
            Pitching Round
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <StatusBadge status={pitchingStatus} isJurorStatus={true} />
          </div>
          
          {pitchingData && pitchingData.assigned > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{getProgressPercentage(pitchingData)}%</span>
                </div>
                <Progress value={getProgressPercentage(pitchingData)} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned:</span>
                  <span className="font-medium">{pitchingData.assigned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium text-green-600">{pitchingData.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Progress:</span>
                  <span className="font-medium text-blue-600">{pitchingData.inProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Not Started:</span>
                  <span className="font-medium text-yellow-600">{pitchingData.notStarted}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No assignments in this round</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}