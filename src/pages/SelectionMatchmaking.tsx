import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MatchmakingWorkflow } from "@/components/cm/MatchmakingWorkflow";

const SelectionMatchmaking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPhase, setCurrentPhase] = useState<'screeningPhase' | 'pitchingPhase'>('screeningPhase');

  // Initialize phase from URL parameters - only run once on mount
  useEffect(() => {
    const phaseParam = searchParams.get('phase');
    if (phaseParam === 'pitching' && currentPhase !== 'pitchingPhase') {
      setCurrentPhase('pitchingPhase');
    } else if (phaseParam === 'screening' && currentPhase !== 'screeningPhase') {
      setCurrentPhase('screeningPhase');
    } else if (!phaseParam) {
      // No phase parameter, default to screening and update URL once
      setSearchParams({
        phase: 'screening'
      }, {
        replace: true
      });
    }
  }, [searchParams.get('phase')]);

  // Update URL when phase changes (called by Select component)
  const handlePhaseChange = useCallback((newPhase: 'screeningPhase' | 'pitchingPhase') => {
    const phaseParam = newPhase === 'pitchingPhase' ? 'pitching' : 'screening';
    const currentPhaseParam = searchParams.get('phase');

    // Only update if the phase is actually different
    if (currentPhaseParam !== phaseParam) {
      setCurrentPhase(newPhase);
      setSearchParams({
        phase: phaseParam
      }, {
        replace: true
      });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with Global Phase Selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Matchmaking</h1>
              <p className="text-lg text-muted-foreground">
                Assign jurors to startups for {currentPhase === 'screeningPhase' ? 'screening evaluation' : 'pitch sessions'}
              </p>
            </div>
            
            {/* Global Phase Selector */}
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="global-phase-selector" className="text-sm font-medium">
                  Current Phase:
                </Label>
                <Select value={currentPhase} onValueChange={(value: 'screeningPhase' | 'pitchingPhase') => handlePhaseChange(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screeningPhase">Screening</SelectItem>
                    <SelectItem value="pitchingPhase">Pitching</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={currentPhase === 'screeningPhase' ? 'secondary' : 'default'}>
                  {currentPhase === 'screeningPhase' ? 'Screening' : 'Pitching'}
                </Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Matchmaking Workflow */}
        <MatchmakingWorkflow currentPhase={currentPhase} />
      </main>
    </div>
  );
};

export default SelectionMatchmaking;