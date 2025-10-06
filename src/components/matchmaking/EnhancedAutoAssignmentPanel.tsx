import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InlineJurorSearch } from "./InlineJurorSearch";
import {
  StartupAssignments,
  WhyNotAssigned,
  Startup,
  Juror,
  calculateMatchScore,
  MatchScore,
} from "@/utils/explainableMatchmakingEngine";

interface EnhancedAutoAssignmentPanelProps {
  suggestions: StartupAssignments[];
  whyNotAssigned: WhyNotAssigned[];
  allJurors: Juror[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (assignments: { juror_id: string; startup_id: string }[]) => void;
  onCancel: () => void;
  config: any;
}

export function EnhancedAutoAssignmentPanel({
  suggestions,
  whyNotAssigned,
  allJurors,
  open,
  onOpenChange,
  onApprove,
  onCancel,
  config,
}: EnhancedAutoAssignmentPanelProps) {
  const [selectedSlots, setSelectedSlots] = useState<Map<string, Set<string>>>(new Map());
  const [whyNotOpen, setWhyNotOpen] = useState(false);

  // Initialize selections (all selected by default)
  useState(() => {
    const initial = new Map<string, Set<string>>();
    suggestions.forEach(sa => {
      const selected = new Set<string>();
      sa.suggested_jurors.forEach(slot => selected.add(slot.juror.id));
      initial.set(sa.startup.id, selected);
    });
    setSelectedSlots(initial);
  });

  const toggleSlot = (startupId: string, jurorId: string) => {
    setSelectedSlots(prev => {
      const newMap = new Map(prev);
      const startupSet = new Set(newMap.get(startupId) || []);
      
      if (startupSet.has(jurorId)) {
        startupSet.delete(jurorId);
      } else {
        startupSet.add(jurorId);
      }
      
      newMap.set(startupId, startupSet);
      return newMap;
    });
  };

  const handleReplaceJuror = (startupId: string, oldJurorId: string, newJuror: Juror) => {
    setSelectedSlots(prev => {
      const newMap = new Map(prev);
      const startupSet = new Set(newMap.get(startupId) || []);
      startupSet.delete(oldJurorId);
      startupSet.add(newJuror.id);
      newMap.set(startupId, startupSet);
      return newMap;
    });
  };

  const handleAcceptRow = (startupId: string) => {
    const selected = selectedSlots.get(startupId) || new Set();
    const assignments = Array.from(selected).map(jurorId => ({
      juror_id: jurorId,
      startup_id: startupId,
    }));
    onApprove(assignments);
  };

  const handleAcceptAll = () => {
    const allAssignments: { juror_id: string; startup_id: string }[] = [];
    selectedSlots.forEach((jurorIds, startupId) => {
      jurorIds.forEach(jurorId => {
        allAssignments.push({ juror_id: jurorId, startup_id: startupId });
      });
    });
    onApprove(allAssignments);
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return "bg-green-100 text-green-800";
    if (score >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Calculate juror loads from selections
  const getJurorLoad = (jurorId: string): number => {
    let count = 0;
    selectedSlots.forEach((jurorIds) => {
      if (jurorIds.has(jurorId)) count++;
    });
    return count;
  };

  const totalSelected = Array.from(selectedSlots.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Auto-Assignment Suggestions</DialogTitle>
          <DialogDescription>
            Top {config?.target_jurors_per_startup || 3} jurors per startup based on explainable scoring.
            Select which assignments to approve.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 my-4">
          <Card className="p-3">
            <p className="text-sm text-muted-foreground">Total Assignments</p>
            <p className="text-2xl font-bold">{totalSelected}</p>
          </Card>
          <Card className="p-3">
            <p className="text-sm text-muted-foreground">Startups</p>
            <p className="text-2xl font-bold">{suggestions.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-sm text-muted-foreground">Avg Score</p>
            <p className="text-2xl font-bold">
              {(
                suggestions.reduce((sum, sa) => 
                  sum + sa.suggested_jurors.reduce((s, slot) => s + slot.score.total_score, 0), 0
                ) / (suggestions.reduce((sum, sa) => sum + sa.suggested_jurors.length, 0) || 1)
              ).toFixed(1)}
            </p>
          </Card>
        </div>

        <ScrollArea className="h-96 pr-4">
          <div className="space-y-3">
            {suggestions.map((sa) => {
              const startupSelected = selectedSlots.get(sa.startup.id) || new Set();
              
              return (
                <Card key={sa.startup.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{sa.startup.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sa.startup.verticals?.join(', ')} • {sa.startup.stage}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {startupSelected.size}/{config?.target_jurors_per_startup || 3} Jurors
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRow(sa.startup.id)}
                        disabled={startupSelected.size === 0}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept Row
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {sa.suggested_jurors.map((slot, idx) => {
                      const isSelected = startupSelected.has(slot.juror.id);
                      const jurorLoad = getJurorLoad(slot.juror.id);
                      const jurorCapacity = slot.juror.evaluation_limit || 10;
                      
                      return (
                        <div
                          key={idx}
                          className={`p-3 border rounded-lg transition-all ${
                            isSelected ? 'border-primary bg-accent/50' : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSlot(sa.startup.id, slot.juror.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{slot.juror.name}</p>
                                  <Badge variant="outline" className="text-xs">
                                    Load: {jurorLoad}/{jurorCapacity}
                                  </Badge>
                                </div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-sm text-muted-foreground cursor-help">
                                        {slot.score.reason}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                      <div className="space-y-1 text-xs">
                                        <p>Vertical: +{slot.score.components.vertical.toFixed(1)}</p>
                                        <p>Stage: +{slot.score.components.stage.toFixed(1)}</p>
                                        <p>Region: +{slot.score.components.region.toFixed(1)}</p>
                                        <p>Thesis: +{slot.score.components.thesis.toFixed(1)}</p>
                                        <p>Load: +{slot.score.components.load_penalty.toFixed(1)}</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            
                            <Badge className={getScoreColor(slot.score.total_score)}>
                              {slot.score.total_score.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {whyNotAssigned.length > 0 && (
          <Collapsible open={whyNotOpen} onOpenChange={setWhyNotOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                <AlertCircle className="h-4 w-4 mr-2" />
                Why weren't some startups assigned? ({whyNotAssigned.length})
                {whyNotOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-40 mt-2">
                <div className="space-y-1 text-sm">
                  {whyNotAssigned.slice(0, 20).map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 px-2 hover:bg-accent rounded">
                      <span>{item.startup_name} → {item.juror_name}</span>
                      <span className="text-muted-foreground">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleAcceptAll} disabled={totalSelected === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept All ({totalSelected})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
