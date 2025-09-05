import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  FileText,
  Trophy,
  ArrowRight
} from "lucide-react";
import { useRounds, type Round } from "@/hooks/useRounds";
import { useRoundData } from "@/hooks/useRoundData";

interface RoundManagementProps {
  roundName: string;
  roundInfo: Round;
}

export const RoundManagement = ({ roundName, roundInfo }: RoundManagementProps) => {
  const { completeRound, getRoundProgress, validateRoundCompletion } = useRounds();
  const { loading } = useRoundData(roundName);
  const [progress, setProgress] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [roundName]);

  const loadProgress = async () => {
    const [progressData, validationData] = await Promise.all([
      getRoundProgress(roundName),
      validateRoundCompletion(roundName)
    ]);
    setProgress(progressData);
    setValidation(validationData);
  };

  const handleCompleteRound = async () => {
    setCompleting(true);
    const success = await completeRound(roundName);
    if (success) {
      setShowCompleteDialog(false);
    }
    setCompleting(false);
  };

  const getNextRoundName = () => {
    return roundName === 'screening' ? 'pitching' : 'final selection';
  };

  if (loading || !progress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Round Management - {roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round
            </CardTitle>
            <CardDescription>
              Monitor progress and manage round completion
            </CardDescription>
          </div>
          <Badge variant="default">
            Active Round
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Evaluations Progress</span>
            </div>
            <Progress value={progress.completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress.evaluationsCompleted} of {progress.assignmentsTotal} completed ({progress.completionRate.toFixed(1)}%)
            </p>
          </div>

          {roundName === 'screening' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Startups Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{progress.startupsSelected}</span>
                <span className="text-sm text-muted-foreground">for pitching</span>
              </div>
            </div>
          )}

          {roundName === 'pitching' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pitches Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{progress.pitchesCompleted || 0}</span>
                <span className="text-sm text-muted-foreground">pitch sessions</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Round Status</span>
            </div>
            <Badge variant={validation?.canComplete ? "default" : "secondary"}>
              {validation?.canComplete ? "Ready to Complete" : "In Progress"}
            </Badge>
          </div>
        </div>

        {/* Validation Status */}
        {validation && !validation.canComplete && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Requirements not met:</strong> {validation.reason}
            </AlertDescription>
          </Alert>
        )}

        {validation?.canComplete && (
          <Alert className="border-success bg-success/5">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              All requirements met! This round is ready to be completed.
            </AlertDescription>
          </Alert>
        )}

        {/* Round Completion */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <h4 className="font-medium">Complete {roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round</h4>
            <p className="text-sm text-muted-foreground">
              Finalize this round and {roundName === 'screening' ? 'activate pitching round' : 'complete the evaluation process'}
            </p>
          </div>

          <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
            <DialogTrigger asChild>
              <Button 
                disabled={!validation?.canComplete}
                size="lg"
              >
                Complete Round
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete {roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round</DialogTitle>
                <DialogDescription>
                  Are you sure you want to complete the {roundName} round? This action will:
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Lock all {roundName} evaluations and prevent further changes</li>
                    <li>Mark the {roundName} round as completed</li>
                    {roundName === 'screening' && <li>Activate the pitching round for selected startups</li>}
                    {roundName === 'pitching' && <li>Finalize the evaluation process</li>}
                  </ul>
                  
                  <div className="mt-4 p-3 bg-warning/10 rounded-md">
                    <p className="text-sm font-medium text-warning-foreground">
                      ⚠️ This action cannot be undone
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCompleteRound} disabled={completing}>
                  {completing ? 'Completing...' : `Complete ${roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};