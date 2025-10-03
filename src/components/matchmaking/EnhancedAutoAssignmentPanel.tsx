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
  JurorSuggestions,
  WhyNotAssigned,
  Startup,
  calculateMatchScore,
  MatchScore,
} from "@/utils/explainableMatchmakingEngine";

interface EnhancedAutoAssignmentPanelProps {
  suggestions: JurorSuggestions[];
  whyNotAssigned: WhyNotAssigned[];
  allStartups: Startup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (assignments: { juror_id: string; startup_id: string }[]) => void;
  onCancel: () => void;
  config: any;
}

export function EnhancedAutoAssignmentPanel({
  suggestions,
  whyNotAssigned,
  allStartups,
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
    suggestions.forEach(js => {
      const selected = new Set<string>();
      js.suggestions.forEach(slot => selected.add(slot.startup.id));
      initial.set(js.juror.id, selected);
    });
    setSelectedSlots(initial);
  });

  const toggleSlot = (jurorId: string, startupId: string) => {
    setSelectedSlots(prev => {
      const newMap = new Map(prev);
      const jurorSet = new Set(newMap.get(jurorId) || []);
      
      if (jurorSet.has(startupId)) {
        jurorSet.delete(startupId);
      } else {
        jurorSet.add(startupId);
      }
      
      newMap.set(jurorId, jurorSet);
      return newMap;
    });
  };

  const handleReplaceStartup = (jurorId: string, oldStartupId: string, newStartup: Startup) => {
    setSelectedSlots(prev => {
      const newMap = new Map(prev);
      const jurorSet = new Set(newMap.get(jurorId) || []);
      jurorSet.delete(oldStartupId);
      jurorSet.add(newStartup.id);
      newMap.set(jurorId, jurorSet);
      return newMap;
    });
  };

  const handleAcceptRow = (jurorId: string) => {
    const selected = selectedSlots.get(jurorId) || new Set();
    const assignments = Array.from(selected).map(startupId => ({
      juror_id: jurorId,
      startup_id: startupId,
    }));
    onApprove(assignments);
  };

  const handleAcceptAll = () => {
    const allAssignments: { juror_id: string; startup_id: string }[] = [];
    selectedSlots.forEach((startupIds, jurorId) => {
      startupIds.forEach(startupId => {
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

  const getCapacityBadge = (current: number, limit: number) => {
    const ratio = current / limit;
    if (ratio >= 1) return <Badge variant="destructive">At Capacity</Badge>;
    if (ratio >= 0.8) return <Badge className="bg-yellow-100 text-yellow-800">Near Capacity</Badge>;
    return <Badge variant="outline">{current}/{limit}</Badge>;
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
            Top {config?.top_k_per_juror || 3} startups per juror based on explainable scoring.
            Select which assignments to approve.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 my-4">
          <Card className="p-3">
            <p className="text-sm text-muted-foreground">Total Assignments</p>
            <p className="text-2xl font-bold">{totalSelected}</p>
          </Card>
          <Card className="p-3">
            <p className="text-sm text-muted-foreground">Jurors</p>
            <p className="text-2xl font-bold">{suggestions.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-sm text-muted-foreground">Avg Score</p>
            <p className="text-2xl font-bold">
              {(
                suggestions.reduce((sum, js) => 
                  sum + js.suggestions.reduce((s, slot) => s + slot.score.total_score, 0), 0
                ) / (suggestions.reduce((sum, js) => sum + js.suggestions.length, 0) || 1)
              ).toFixed(1)}
            </p>
          </Card>
        </div>

        <ScrollArea className="h-96 pr-4">
          <div className="space-y-3">
            {suggestions.map((js) => {
              const jurorSelected = selectedSlots.get(js.juror.id) || new Set();
              
              return (
                <Card key={js.juror.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{js.juror.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {js.juror.target_verticals?.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCapacityBadge(js.current_load, js.capacity_limit)}
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRow(js.juror.id)}
                        disabled={jurorSelected.size === 0}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept Row
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {js.suggestions.map((slot, idx) => {
                      const isSelected = jurorSelected.has(slot.startup.id);
                      
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
                                onChange={() => toggleSlot(js.juror.id, slot.startup.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <p className="font-medium">{slot.startup.name}</p>
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
                            
                            <div className="flex items-center gap-2">
                              <Badge className={getScoreColor(slot.score.total_score)}>
                                {slot.score.total_score.toFixed(1)}
                              </Badge>
                              <InlineJurorSearch
                                allStartups={allStartups}
                                currentStartupId={slot.startup.id}
                                excludeStartupIds={Array.from(jurorSelected)}
                                onSelect={(newStartup) => 
                                  handleReplaceStartup(js.juror.id, slot.startup.id, newStartup)
                                }
                                calculateScore={(startupId) => 
                                  calculateMatchScore(
                                    js.juror,
                                    allStartups.find(s => s.id === startupId)!,
                                    js.current_load,
                                    config
                                  )
                                }
                              />
                            </div>
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
