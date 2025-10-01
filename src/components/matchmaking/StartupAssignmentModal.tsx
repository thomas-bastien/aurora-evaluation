import { useState, useEffect } from 'react';
import { MatchmakingCompatibility } from './MatchmakingCompatibility';
import { findBestJurors } from '@/utils/matchmakingUtils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Building2, Mail, User, Star, Target, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Startup {
  id: string;
  name: string;
  verticals?: string[];
  stage: string;
  description: string;
  location: string;
  founder_names: string[];
  regions?: string[];
}

interface Juror {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  preferred_regions?: string[] | null;
  target_verticals?: string[] | null;
  preferred_stages?: string[] | null;
  linkedin_url?: string | null;
  evaluation_limit?: number | null;
}

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

interface StartupAssignmentModalProps {
  startup: Startup;
  jurors: Juror[];
  existingAssignments: Assignment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (assignments: Assignment[]) => void;
}

export const StartupAssignmentModal = ({
  startup,
  jurors,
  existingAssignments,
  open,
  onOpenChange,
  onComplete
}: StartupAssignmentModalProps) => {
  const [selectedJurorIds, setSelectedJurorIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Initialize selected jurors from existing assignments
  useEffect(() => {
    setSelectedJurorIds(existingAssignments.map(a => a.juror_id));
  }, [existingAssignments]);

  const filteredJurors = jurors.filter(juror =>
    juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    juror.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    juror.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate fit score between startup and juror (10-point scale)
  const calculateFitScore = (juror: Juror) => {
    let score = 0;
    let matches = {
      region: false,
      vertical: false,
      stage: false
    };
    let breakdown = {
      region: 0,
      vertical: 0,
      stage: 0
    };

    // Region match (+4 points)
    if (juror.preferred_regions && startup.regions) {
      const regionMatches = startup.regions.some(region => juror.preferred_regions!.includes(region));
      if (regionMatches) {
        score += 4;
        breakdown.region = 4;
        matches.region = true;
      }
    }

    // Vertical match (+3 points)
    if (juror.target_verticals && startup.verticals) {
      const verticalMatches = startup.verticals.some(vertical => juror.target_verticals!.includes(vertical));
      if (verticalMatches) {
        score += 3;
        breakdown.vertical = 3;
        matches.vertical = true;
      }
    }

    // Stage match (+3 points)
    if (juror.preferred_stages && startup.stage) {
      if (juror.preferred_stages.includes(startup.stage)) {
        score += 3;
        breakdown.stage = 3;
        matches.stage = true;
      }
    }

    return { score, matches, breakdown };
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Sort jurors by fit score (highest first)
  const sortedJurors = filteredJurors.sort((a, b) => {
    const scoreA = calculateFitScore(a).score;
    const scoreB = calculateFitScore(b).score;
    return scoreB - scoreA;
  });

  const handleJurorToggle = (jurorId: string) => {
    setSelectedJurorIds(prev => 
      prev.includes(jurorId)
        ? prev.filter(id => id !== jurorId)
        : [...prev, jurorId]
    );
  };

  const handleSave = async () => {
    // Soft warning for < 3 jurors (don't block)
    if (selectedJurorIds.length > 0 && selectedJurorIds.length < 3) {
      toast({
        title: "⚠️ Below Recommended Minimum",
        description: `Only ${selectedJurorIds.length} juror(s) assigned. We recommend at least 3 evaluations per startup.`,
      });
    }

    try {
      // Import supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Delete existing assignments for this startup in both tables
      const { error: deleteScreeningError } = await supabase
        .from('screening_assignments')
        .delete()
        .eq('startup_id', startup.id);
      
      const { error: deletePitchingError } = await supabase
        .from('pitching_assignments')
        .delete()
        .eq('startup_id', startup.id);
      
      // If both fail, throw the error (likely means neither table exists for this startup)
      if (deleteScreeningError && deletePitchingError) {
        throw deleteScreeningError; // Default to screening error
      }

      // Create new assignments - default to screening for now
      // TODO: Make this round-aware based on current active round
      const assignmentRecords = selectedJurorIds.map(jurorId => ({
        startup_id: startup.id,
        juror_id: jurorId,
        status: 'assigned'
      }));

      const { error: insertError } = await supabase
        .from('screening_assignments')
        .insert(assignmentRecords);
      
      if (insertError) throw insertError;

      // Create assignment objects for local state update
      const newAssignments: Assignment[] = selectedJurorIds.map(jurorId => {
        const juror = jurors.find(j => j.id === jurorId);
        return {
          startup_id: startup.id,
          juror_id: jurorId,
          startup_name: startup.name,
          juror_name: juror?.name || ''
        };
      });

      onComplete(newAssignments);
      
      toast({
        title: "Success",
        description: "Assignment saved successfully to database."
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: "Error",
        description: "Failed to save assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Assign Jurors to {startup.name}
          </DialogTitle>
          <DialogDescription>
            Select at least 3 jurors to evaluate this startup. You can assign more than 3 if needed.
          </DialogDescription>
        </DialogHeader>

        {/* Startup Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{startup.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                {startup.verticals && startup.verticals.map(vertical => (
                  <Badge key={vertical} variant="outline">{vertical}</Badge>
                ))}
                <Badge variant="outline">{startup.stage}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{startup.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{startup.location}</span>
                {startup.founder_names && startup.founder_names.length > 0 && (
                  <span>Founders: {startup.founder_names.join(", ")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search jurors by name, company, or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection Summary */}
        <div className="mb-4 p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Selected: {selectedJurorIds.length} jurors
            </span>
            <span className="text-sm text-muted-foreground">
              {selectedJurorIds.length >= 3 ? (
                <span className="text-success">✓ Minimum requirement met</span>
              ) : selectedJurorIds.length > 0 ? (
                <span className="text-warning">⚠️ Below minimum (3 recommended)</span>
              ) : (
                <span className="text-muted-foreground">No jurors selected</span>
              )}
            </span>
          </div>
        </div>

        {/* Jurors List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedJurors.map((juror) => {
            const isSelected = selectedJurorIds.includes(juror.id);
            const { score, matches, breakdown } = calculateFitScore(juror);
            
            return (
              <div
                key={juror.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => handleJurorToggle(juror.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => {}} // Handled by parent onClick
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{juror.name}</span>
                      </div>
                      {/* Prominent Fit Score Badge */}
                      <div className={`px-3 py-1 rounded-full border font-semibold text-sm ${getScoreColor(score)}`}>
                        {score}/10
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span>{juror.job_title}</span>
                      <span>@{juror.company}</span>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {juror.email}
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    {score > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-2">Fit Score Breakdown:</div>
                        <div className="flex flex-wrap gap-2">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${matches.region ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <MapPin className="w-2 h-2" />
                            Region: {breakdown.region}/4
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${matches.vertical ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Target className="w-2 h-2" />
                            Vertical: {breakdown.vertical}/3
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${matches.stage ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Building2 className="w-2 h-2" />
                            Stage: {breakdown.stage}/3
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Zero Score Message */}
                    {score === 0 && (
                      <div className="mt-2 text-xs text-muted-foreground italic">
                        No criteria matches found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredJurors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No jurors found matching your search criteria.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedJurorIds.length} of {jurors.length} jurors selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
            >
              Save Assignment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};