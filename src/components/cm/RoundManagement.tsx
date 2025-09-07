import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  FileText,
  Trophy,
  ArrowRight,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { useRounds, type Round } from "@/hooks/useRounds";
import { useRoundData } from "@/hooks/useRoundData";

interface RoundManagementProps {
  roundName: string;
  roundInfo: Round;
}

export const RoundManagement = ({ roundName, roundInfo }: RoundManagementProps) => {
  const { completeRound, reopenRound, getRoundProgress, validateRoundCompletion, validateRoundReopen } = useRounds();
  const { loading } = useRoundData(roundName);
  const [progress, setProgress] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [reopenValidation, setReopenValidation] = useState<any>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [roundName]);

  const loadProgress = async () => {
    if (roundInfo.status === 'active') {
      const [progressData, validationData] = await Promise.all([
        getRoundProgress(roundName),
        validateRoundCompletion(roundName)
      ]);
      setProgress(progressData);
      setValidation(validationData);
    } else if (roundInfo.status === 'completed') {
      const reopenValidationData = await validateRoundReopen(roundName);
      setReopenValidation(reopenValidationData);
    }
  };

  const handleCompleteRound = async () => {
    setCompleting(true);
    const success = await completeRound(roundName);
    if (success) {
      setShowCompleteDialog(false);
    }
    setCompleting(false);
  };

  const handleReopenRound = async () => {
    if (!confirmReopen) return;
    
    setReopening(true);
    const success = await reopenRound(roundName);
    if (success) {
      setShowReopenDialog(false);
      setConfirmReopen(false);
    }
    setReopening(false);
  };

  const getNextRoundName = () => {
    return roundName === 'screening' ? 'pitching' : 'final selection';
  };

  if (loading || (roundInfo.status === 'active' && !progress)) {
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

  // Show completed round management
  if (roundInfo.status === 'completed') {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Round Completed - {roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round
              </CardTitle>
              <CardDescription>
                This round was completed on{' '}
                {roundInfo.completed_at && new Date(roundInfo.completed_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-success text-success-foreground">
              Completed
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-success bg-success/5">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              The {roundName} round has been successfully completed. All evaluations are locked and the next phase is active.
            </AlertDescription>
          </Alert>

          {/* Reopen Round Section */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Reopen {roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round
              </h4>
              <p className="text-sm text-muted-foreground">
                Undo round completion to make changes to evaluations or selections
              </p>
            </div>

            <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  disabled={!reopenValidation?.canReopen}
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reopen Round
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Reopen {roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round
                  </DialogTitle>
                  <DialogDescription>
                    <div className="space-y-4">
                      <p className="font-medium text-foreground">
                        This will revert the {roundName} round to active status and deactivate the{' '}
                        {getNextRoundName().toLowerCase()} round.
                      </p>
                      
                      <Alert className="border-warning bg-warning/10">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <AlertDescription>
                          <strong className="text-warning-foreground">Important Consequences:</strong>
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• The {getNextRoundName().toLowerCase()} round will become inactive (status: pending)</li>
                            {reopenValidation?.affectedData?.assignments > 0 && (
                              <li>• {reopenValidation.affectedData.assignments} existing assignments will remain but become inaccessible</li>
                            )}
                            {reopenValidation?.affectedData?.evaluations > 0 && (
                              <li>• {reopenValidation.affectedData.evaluations} submitted evaluations will be preserved but inactive</li>
                            )}
                            {reopenValidation?.affectedData?.pitches > 0 && (
                              <li>• {reopenValidation.affectedData.pitches} pitch sessions will be affected</li>
                            )}
                            <li>• You will need to complete the {roundName} round again to reactivate {getNextRoundName().toLowerCase()}</li>
                            <li>• All stakeholders should be notified about this change</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Data Impact Summary:</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-success">Preserved Data:</p>
                            <ul className="text-muted-foreground space-y-1">
                              <li>• {roundName.charAt(0).toUpperCase() + roundName.slice(1)} evaluations (can be modified)</li>
                              <li>• Startup selections (can be changed)</li>
                              <li>• All historical data</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-warning">Temporarily Inactive:</p>
                            <ul className="text-muted-foreground space-y-1">
                              <li>• {getNextRoundName()} assignments</li>
                              <li>• {getNextRoundName()} evaluations</li>
                              <li>• Associated workflows</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="confirm-reopen" 
                          checked={confirmReopen}
                          onCheckedChange={(checked) => setConfirmReopen(checked as boolean)}
                        />
                        <label htmlFor="confirm-reopen" className="text-sm font-medium">
                          I understand the consequences and want to reopen the {roundName} round
                        </label>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowReopenDialog(false);
                      setConfirmReopen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleReopenRound} 
                    disabled={!confirmReopen || reopening}
                    variant="default"
                  >
                    {reopening ? 'Reopening...' : `Reopen ${roundName.charAt(0).toUpperCase() + roundName.slice(1)} Round`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!reopenValidation?.canReopen && (
            <Alert className="border-warning bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                Cannot reopen: {reopenValidation?.reason}
              </AlertDescription>
            </Alert>
          )}
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
            <AlertDescription className="text-foreground">
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