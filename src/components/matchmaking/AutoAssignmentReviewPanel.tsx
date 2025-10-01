import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Users, Target, TrendingUp, Eye } from "lucide-react";
import { AutoAssignmentProposal, WorkloadDistribution, Assignment } from '@/utils/autoAssignmentEngine';

interface AutoAssignmentReviewPanelProps {
  proposals: AutoAssignmentProposal[];
  workloadDistribution: WorkloadDistribution[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (assignments: Assignment[]) => void;
  onCancel: () => void;
}

export const AutoAssignmentReviewPanel = ({
  proposals,
  workloadDistribution,
  open,
  onOpenChange,
  onApprove,
  onCancel
}: AutoAssignmentReviewPanelProps) => {
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(
    new Set(proposals.map(p => p.startupId))
  );

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success bg-success/10 border-success/20';
    if (score >= 5) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  const getWorkloadColor = (distribution: WorkloadDistribution) => {
    if (distribution.exceedsLimit) return 'text-destructive';
    if (distribution.proposedAssignments === distribution.evaluationLimit) return 'text-warning';
    if (distribution.isOverloaded) return 'text-warning';
    return 'text-success';
  };

  const handleApprove = () => {
    const approvedAssignments: Assignment[] = [];
    
    proposals
      .filter(proposal => selectedProposals.has(proposal.startupId))
      .forEach(proposal => {
        proposal.proposedJurors.forEach(juror => {
          approvedAssignments.push({
            startup_id: proposal.startupId,
            juror_id: juror.jurorId,
            startup_name: proposal.startupName,
            juror_name: juror.jurorName
          });
        });
      });

    onApprove(approvedAssignments);
  };

  const toggleProposal = (startupId: string) => {
    const newSelected = new Set(selectedProposals);
    if (newSelected.has(startupId)) {
      newSelected.delete(startupId);
    } else {
      newSelected.add(startupId);
    }
    setSelectedProposals(newSelected);
  };

  const totalAssignments = Array.from(selectedProposals).length * 3;
  const avgScore = proposals.length > 0 
    ? proposals.reduce((sum, p) => sum + p.proposedJurors.reduce((jSum, j) => jSum + j.fitScore, 0), 0) / (proposals.length * 3)
    : 0;

  const overloadedJurors = workloadDistribution.filter(wd => wd.exceedsLimit).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Auto-Assignment Review & Approval
          </DialogTitle>
          <DialogDescription>
            Review proposed juror assignments and workload distribution. You can deselect individual startups before applying.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="proposals">Assignment Proposals</TabsTrigger>
            <TabsTrigger value="workload">Workload Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="space-y-4">
            {/* Warning banner for over-limit jurors */}
            {workloadDistribution.some(d => d.exceedsLimit) && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  <span className="font-medium text-warning">Juror Limit Warnings</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {workloadDistribution.filter(d => d.exceedsLimit).length} juror(s) will exceed their evaluation limit:
                </p>
                <ul className="text-sm space-y-1">
                  {workloadDistribution.filter(d => d.exceedsLimit).slice(0, 5).map(d => (
                    <li key={d.jurorId} className="text-muted-foreground">
                      • {d.jurorName}: {d.proposedAssignments} / {d.evaluationLimit}
                      {d.isCustomLimit && <span className="ml-2 text-xs">(custom limit)</span>}
                    </li>
                  ))}
                  {workloadDistribution.filter(d => d.exceedsLimit).length > 5 && (
                    <li className="text-muted-foreground">... and {workloadDistribution.filter(d => d.exceedsLimit).length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalAssignments}</div>
                  <p className="text-xs text-muted-foreground">
                    {selectedProposals.size} startups × 3 jurors each
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Average Fit Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgScore.toFixed(1)}/10</div>
                  <p className="text-xs text-muted-foreground">
                    Based on selected proposals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Workload Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{overloadedJurors}</div>
                  <p className="text-xs text-muted-foreground">
                    Jurors over target load
                  </p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Proposals List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {proposals.map((proposal) => {
                const isSelected = selectedProposals.has(proposal.startupId);
                
                return (
                  <Card 
                    key={proposal.startupId} 
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleProposal(proposal.startupId)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{proposal.startupName}</CardTitle>
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-muted-foreground rounded-full" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {proposal.proposedJurors.map((juror, index) => (
                        <div key={juror.jurorId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <span className="font-medium">{juror.jurorName}</span>
                            <p className="text-sm text-muted-foreground">{juror.reasoning}</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${getScoreColor(juror.fitScore)} font-semibold`}
                          >
                            {juror.fitScore.toFixed(1)}/10
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="workload" className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {workloadDistribution
                .sort((a, b) => b.proposedAssignments - a.proposedAssignments)
                .map((distribution) => (
                  <Card key={distribution.jurorId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-medium">{distribution.jurorName}</span>
                            <p className="text-sm text-muted-foreground">
                              Target: {distribution.targetAssignments} assignments
                            </p>
                          </div>
                          {distribution.isCustomLimit && (
                            <Badge variant="outline" className="text-xs">Custom Limit</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getWorkloadColor(distribution)} flex items-center gap-2 justify-end`}>
                            {distribution.currentAssignments} → {distribution.proposedAssignments} / {distribution.evaluationLimit}
                            {distribution.exceedsLimit && <span>⚠️</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {distribution.exceedsLimit
                              ? 'Exceeds limit' 
                              : distribution.proposedAssignments === distribution.evaluationLimit
                              ? 'At limit'
                              : Math.abs(distribution.proposedAssignments - distribution.targetAssignments) <= 1
                              ? 'Balanced'
                              : 'Under target'
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedProposals.size} of {proposals.length} proposals selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={selectedProposals.size === 0}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply Assignments ({totalAssignments} total)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};