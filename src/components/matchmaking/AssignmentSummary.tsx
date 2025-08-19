import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CheckCircle2, AlertCircle } from "lucide-react";

interface Startup {
  id: string;
  name: string;
  industry: string;
  stage: string;
}

interface Juror {
  id: string;
  name: string;
  company: string;
  job_title: string;
}

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

interface AssignmentSummaryProps {
  assignments: Assignment[];
  startups: Startup[];
  jurors: Juror[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isConfirmed: boolean;
}

export const AssignmentSummary = ({
  assignments,
  startups,
  jurors,
  open,
  onOpenChange,
  isConfirmed
}: AssignmentSummaryProps) => {
  // Group assignments by startup
  const assignmentsByStartup = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.startup_id]) {
      acc[assignment.startup_id] = [];
    }
    acc[assignment.startup_id].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  const getStartupInfo = (startupId: string) => {
    return startups.find(s => s.id === startupId);
  };

  const getJurorInfo = (jurorId: string) => {
    return jurors.find(j => j.id === jurorId);
  };

  const totalAssignments = assignments.length;
  const startupsWithAssignments = Object.keys(assignmentsByStartup).length;
  const startupsWithMinimumJurors = Object.values(assignmentsByStartup).filter(
    assignments => assignments.length >= 3
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assignment Summary
          </DialogTitle>
          <DialogDescription>
            Review all startup-juror assignments before final confirmation.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Startups Assigned</span>
            </div>
            <div className="text-2xl font-bold">{startupsWithAssignments}</div>
            <div className="text-xs text-muted-foreground">of {startups.length} total</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Ready for Review</span>
            </div>
            <div className="text-2xl font-bold">{startupsWithMinimumJurors}</div>
            <div className="text-xs text-muted-foreground">3+ jurors assigned</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Total Assignments</span>
            </div>
            <div className="text-2xl font-bold">{totalAssignments}</div>
            <div className="text-xs text-muted-foreground">startup-juror pairs</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              {isConfirmed ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )}
              <span className="text-sm font-medium">Status</span>
            </div>
            <div className="text-2xl font-bold">
              {isConfirmed ? "Confirmed" : "Draft"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isConfirmed ? "Live in system" : "Pending confirmation"}
            </div>
          </div>
        </div>

        {/* Assignments by Startup */}
        <div className="space-y-4">
          {Object.entries(assignmentsByStartup).map(([startupId, startupAssignments]) => {
            const startup = getStartupInfo(startupId);
            const hasMinimumJurors = startupAssignments.length >= 3;

            if (!startup) return null;

            return (
              <div key={startupId} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{startup.name}</h3>
                    <Badge variant="outline">{startup.industry}</Badge>
                    <Badge variant="outline">{startup.stage}</Badge>
                    {hasMinimumJurors ? (
                      <Badge variant="default">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {startupAssignments.length} jurors
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {startupAssignments.length}/3 jurors
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {startupAssignments.map((assignment) => {
                    const juror = getJurorInfo(assignment.juror_id);
                    
                    if (!juror) return null;

                    return (
                      <div
                        key={`${assignment.startup_id}-${assignment.juror_id}`}
                        className="bg-muted/30 rounded-lg p-3"
                      >
                        <div className="font-medium text-sm">{juror.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {juror.job_title} • {juror.company}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(assignmentsByStartup).length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
            <p className="text-muted-foreground">
              Start by assigning jurors to startups from the main Matchmaking page.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {startupsWithMinimumJurors} of {startupsWithAssignments} startups ready for evaluation
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};