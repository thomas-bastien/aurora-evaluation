import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Trophy, 
  CheckCircle, 
  AlertTriangle, 
  Star,
  RotateCcw,
  Download,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface StartupSelection {
  id: string;
  name: string;
  industry: string;
  stage: string;
  region: string;
  status: string;
  averageScore: number;
  totalScore: number;
  rank: number;
  evaluationsCount: number;
  isSelected: boolean;
  isAutoSelected: boolean;
  isPreviouslySelected: boolean;
}

interface Top30SelectionProps {
  currentRound?: string;
  isReadOnly?: boolean;
}

export const Top30Selection = ({ currentRound = 'screening', isReadOnly = false }: Top30SelectionProps) => {
  const [startups, setStartups] = useState<StartupSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);

  useEffect(() => {
    fetchStartupsForSelection();
  }, []);

  useEffect(() => {
    setSelectionCount(startups.filter(s => s.isSelected).length);
  }, [startups]);

  const fetchStartupsForSelection = async () => {
    try {
      // Determine which evaluation table to use based on current round
      const evaluationTable = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
      
      // Fetch startups with their evaluation scores
      const { data: startupsData, error } = await supabase
        .from('startups')
        .select(`
          *,
          ${evaluationTable}!startup_id(
            overall_score,
            status
          )
        `);

      if (error) throw error;

      const selectionData: StartupSelection[] = startupsData?.map(startup => {
        const evaluationKey = currentRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
        const evaluations = startup[evaluationKey] || [];
        const submittedEvaluations = evaluations.filter((e: any) => e.status === 'submitted');
        const scores = submittedEvaluations
          .map(e => e.overall_score)
          .filter(score => score !== null) as number[];
        
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;
        
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        return {
          id: startup.id,
          name: startup.name,
          industry: startup.industry || 'N/A',
          stage: startup.stage || 'N/A',
          region: startup.region || 'N/A',
          status: startup.status || 'pending',
          averageScore,
          totalScore,
          rank: 0, // Will be set after sorting
          evaluationsCount: submittedEvaluations.length,
          isSelected: false,
          isAutoSelected: false,
          isPreviouslySelected: startup.status === 'shortlisted'
        };
      }) || []; // Remove filter to show all startups

      // Sort by total score and assign ranks (startups with no evaluations go to bottom)
      const sortedStartups = selectionData
        .sort((a, b) => {
          // If one has no evaluations and the other does, put no-evaluation at bottom
          if (a.evaluationsCount === 0 && b.evaluationsCount > 0) return 1;
          if (b.evaluationsCount === 0 && a.evaluationsCount > 0) return -1;
          // Otherwise sort by total score
          return b.totalScore - a.totalScore;
        })
        .map((startup, index) => {
          const rank = index + 1;
          const isAutoSelected = rank <= 30 && startup.evaluationsCount > 0;
          return { 
            ...startup, 
            rank,
            isSelected: startup.isPreviouslySelected || isAutoSelected,
            isAutoSelected: !startup.isPreviouslySelected && isAutoSelected
          };
        });

      setStartups(sortedStartups);
    } catch (error) {
      console.error('Error fetching startups for selection:', error);
      toast.error('Failed to load startups for selection');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSelectTop30 = () => {
    setStartups(prev => prev.map(startup => ({
      ...startup,
      isSelected: startup.rank <= 30,
      isAutoSelected: startup.rank <= 30
    })));
    toast.success('Automatically selected top 30 startups by score');
  };

  const handleToggleSelection = (startupId: string) => {
    setStartups(prev => prev.map(startup =>
      startup.id === startupId
        ? { ...startup, isSelected: !startup.isSelected, isAutoSelected: false }
        : startup
    ));
  };

  const handleClearSelections = () => {
    setStartups(prev => prev.map(startup => ({
      ...startup,
      isSelected: false,
      isAutoSelected: false
    })));
    toast.success('All selections cleared');
  };

  const handleConfirmSelection = async () => {
    try {
      const selectedStartups = startups.filter(s => s.isSelected);
      
      // Update startup status to 'shortlisted' for selected startups
      const { error } = await supabase
        .from('startups')
        .update({ status: 'shortlisted' })
        .in('id', selectedStartups.map(s => s.id));

      if (error) throw error;

      // Update non-selected startups to 'evaluated'
      const nonSelectedStartups = startups.filter(s => !s.isSelected);
      if (nonSelectedStartups.length > 0) {
        const { error: nonSelectedError } = await supabase
          .from('startups')
          .update({ status: 'evaluated' })
          .in('id', nonSelectedStartups.map(s => s.id));

        if (nonSelectedError) throw nonSelectedError;
      }

      toast.success(`Successfully selected ${selectedStartups.length} startups for Pitching`);
      setShowConfirmDialog(false);
      
      // Refresh data
      fetchStartupsForSelection();
    } catch (error) {
      console.error('Error confirming selection:', error);
      toast.error('Failed to confirm selection');
    }
  };

  const exportSelectionList = () => {
    const selectedStartups = startups.filter(s => s.isSelected);
    const csvContent = [
      ['Rank', 'Name', 'Industry', 'Stage', 'Region', 'Average Score', 'Total Score', 'Evaluations'],
      ...selectedStartups.map(startup => [
        startup.rank,
        startup.name,
        startup.industry,
        startup.stage,
        startup.region,
        startup.averageScore.toFixed(2),
        startup.totalScore.toFixed(2),
        startup.evaluationsCount
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-30-selection-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedStartups = startups.filter(s => s.isSelected);
  const autoSelectedCount = startups.filter(s => s.isAutoSelected).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Top 30 Startup Selection
            </CardTitle>
            <CardDescription>
              Select the top performing startups to advance to Pitching
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStartupsForSelection}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportSelectionList} disabled={selectionCount === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Selection Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{startups.length}</div>
            <div className="text-sm text-muted-foreground">Total Startups</div>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{selectionCount}</div>
            <div className="text-sm text-muted-foreground">Selected</div>
          </div>
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">{autoSelectedCount}</div>
            <div className="text-sm text-muted-foreground">Auto-Selected</div>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{Math.max(0, 30 - selectionCount)}</div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <Button onClick={handleBulkSelectTop30} disabled={isReadOnly}>
            <Star className="w-4 h-4 mr-2" />
            Auto-Select Top 30
          </Button>
          <Button variant="outline" onClick={handleClearSelections} disabled={isReadOnly}>
            Clear All
          </Button>
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogTrigger asChild>
              <Button 
                className="ml-auto"
                disabled={selectionCount === 0 || isReadOnly}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Selection ({selectionCount})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Top 30 Selection</DialogTitle>
                <DialogDescription>
                  Are you sure you want to finalize the selection of {selectionCount} startups for Pitching? 
                  This action will update their status and cannot be easily undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmSelection}>
                  Confirm Selection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Startup Selection List */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b border-border">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">Select</div>
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Startup</div>
              <div className="col-span-1">Stage</div>
              <div className="col-span-1">Region</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-1">Evals</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>
          
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {startups.map(startup => (
              <div key={startup.id} className={`px-4 py-3 transition-colors ${
                startup.isSelected ? 'bg-success/5 border-success/20' : 'hover:bg-muted/50'
              }`}>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <Checkbox
                      checked={startup.isSelected}
                      onCheckedChange={() => handleToggleSelection(startup.id)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      {startup.rank <= 30 && <Trophy className="w-4 h-4 text-warning" />}
                      <span className="font-medium">{startup.rank}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{startup.name}</h4>
                        {startup.evaluationsCount === 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            <span className="text-xs text-warning font-medium">No Evaluations</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{startup.industry}</p>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Badge variant="outline">{startup.stage}</Badge>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm">{startup.region}</span>
                  </div>
                  <div className="col-span-2">
                    <div>
                      <div className="font-semibold text-lg">{startup.averageScore.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Total: {startup.totalScore.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm ${startup.evaluationsCount === 0 ? 'text-warning font-medium' : ''}`}>
                        {startup.evaluationsCount}
                      </span>
                      {startup.evaluationsCount === 0 && (
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      )}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex flex-col gap-1">
                      {startup.isSelected ? (
                        <Badge className="bg-success text-success-foreground">
                          {startup.isPreviouslySelected ? 'Previously Selected' : (startup.isAutoSelected ? 'Auto' : 'Manual')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Selected</Badge>
                      )}
                      
                      {/* Evaluation status warnings */}
                      {startup.evaluationsCount === 0 && (
                        <Badge variant="destructive" className="text-xs">
                          No Evaluations
                        </Badge>
                      )}
                      
                      {/* Status context based on startup's current status relative to round */}
                      {startup.status === 'shortlisted' && (
                        <Badge variant="secondary" className="text-xs">
                          Advanced to Pitching
                        </Badge>
                      )}
                      {startup.status === 'finalist' && (
                        <Badge variant="secondary" className="text-xs">
                          Reached Finals
                        </Badge>
                      )}
                      {startup.status === 'under-review' && (
                        <Badge variant="default" className="text-xs">
                          Active in Round
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {startups.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No startups available</h3>
            <p className="text-muted-foreground">
              No startups found for this round
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};