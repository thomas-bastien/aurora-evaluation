import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const SelectionMatchmaking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentRound, setCurrentRound] = useState<'screeningRound' | 'pitchingRound'>('screeningRound');

  // Initialize round from URL parameters - only run once on mount
  useEffect(() => {
    const roundParam = searchParams.get('round');
    if (roundParam === 'pitching' && currentRound !== 'pitchingRound') {
      setCurrentRound('pitchingRound');
    } else if (roundParam === 'screening' && currentRound !== 'screeningRound') {
      setCurrentRound('screeningRound');
    } else if (!roundParam) {
      // No round parameter, default to screening and update URL once
      setSearchParams({
        round: 'screening'
      }, {
        replace: true
      });
    }
  }, [searchParams.get('round')]);

  // Update URL when round changes (called by Select component)
  const handleRoundChange = useCallback((newRound: 'screeningRound' | 'pitchingRound') => {
    const roundParam = newRound === 'pitchingRound' ? 'pitching' : 'screening';
    const currentRoundParam = searchParams.get('round');

    // Only update if the round is actually different
    if (currentRoundParam !== roundParam) {
      setCurrentRound(newRound);
      setSearchParams({
        round: roundParam
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
                Assign jurors to startups for {currentRound === 'screeningRound' ? 'screening evaluation' : 'pitch sessions'}
              </p>
            </div>
            
            {/* Global Round Selector */}
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="global-round-selector" className="text-sm font-medium">
                  Current Round:
                </Label>
                <Select value={currentRound} onValueChange={(value: 'screeningRound' | 'pitchingRound') => handleRoundChange(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screeningRound">Screening Round</SelectItem>
                    <SelectItem value="pitchingRound">Pitching Round</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={currentRound === 'screeningRound' ? 'secondary' : 'default'}>
                  {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
                </Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Placeholder for Matchmaking Workflow */}
        <Card>
          <div className="p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Matchmaking Workflow</h2>
            <p className="text-muted-foreground">
              Current Round: {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This will contain the matchmaking functionality for the selected round.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default SelectionMatchmaking;