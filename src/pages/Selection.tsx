import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, Users, Star, MessageSquare, FileText, Lock, CheckCircle } from "lucide-react";
import { MatchmakingWorkflow } from "@/components/cm/MatchmakingWorkflow";
import { JurorProgressMonitoring } from "@/components/cm/JurorProgressMonitoring";
import { StartupSelection } from "@/components/cm/StartupSelection";
import { ResultsCommunication } from "@/components/cm/ResultsCommunication";
import { ReportingDocumentation } from "@/components/cm/ReportingDocumentation";
import { useRounds } from "@/hooks/useRounds";
const Selection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentRound, setCurrentRound] = useState<'screeningRound' | 'pitchingRound'>('screeningRound');
  const { rounds, activeRound, loading: roundsLoading, canModifyRound } = useRounds();

  // Initialize round from URL parameters - only run once on mount
  useEffect(() => {
    const roundParam = searchParams.get('round');
    if (roundParam === 'pitching' && currentRound !== 'pitchingRound') {
      setCurrentRound('pitchingRound');
    } else if (roundParam === 'screening' && currentRound !== 'screeningRound') {
      setCurrentRound('screeningRound');
    } else if (!roundParam && activeRound) {
      // Default to active round if no param specified
      const activeRoundValue = activeRound.name === 'screening' ? 'screeningRound' : 'pitchingRound';
      setCurrentRound(activeRoundValue);
      setSearchParams({
        round: activeRound.name
      }, {
        replace: true
      });
    }
  }, [searchParams.get('round'), activeRound]);

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

  // Get current round info
  const currentRoundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';
  const currentRoundInfo = rounds.find(r => r.name === currentRoundName);
  // Only allow modifications to the active round
  const isReadOnly = activeRound?.name !== currentRoundName;
  return <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with Global Phase Selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Startup Selection</h1>
              <p className="text-lg text-muted-foreground">
                Manage the complete evaluation workflow and startup selection process
              </p>
            </div>
            
            {/* Global Round Selector */}
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="global-round-selector" className="text-sm font-medium">
                  Round Navigation:
                </Label>
                <Select value={currentRound} onValueChange={(value: 'screeningRound' | 'pitchingRound') => handleRoundChange(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rounds.map(round => (
                      <SelectItem 
                        key={round.name} 
                        value={round.name === 'screening' ? 'screeningRound' : 'pitchingRound'}
                      >
                        <div className="flex items-center gap-2">
                          {round.status === 'completed' && <CheckCircle className="w-4 h-4 text-success" />}
                          {round.status === 'pending' && <Lock className="w-4 h-4 text-muted-foreground" />}
                          {round.name === 'screening' ? 'Screening' : 'Pitching'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    currentRoundInfo?.status === 'active' ? 'default' : 
                    currentRoundInfo?.status === 'completed' ? 'secondary' : 'outline'
                  }>
                    {currentRoundInfo?.status === 'active' && 'Active'}
                    {currentRoundInfo?.status === 'completed' && 'Completed'}
                    {currentRoundInfo?.status === 'pending' && 'Pending'}
                  </Badge>
                  {isReadOnly && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Lock className="w-3 h-3 mr-1" />
                      View Only
                    </Badge>
                  )}
                  {currentRoundInfo?.status === 'pending' && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      Not Started
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Selection Tabs */}
        <Tabs defaultValue="matchmaking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="matchmaking" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Matchmaking
            </TabsTrigger>
            <TabsTrigger value="juror-progress" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Jury Progress
            </TabsTrigger>
            <TabsTrigger value="startup-selection" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Selection
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reporting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matchmaking" className="space-y-6">
            <MatchmakingWorkflow currentRound={currentRound} />
          </TabsContent>

          <TabsContent value="juror-progress" className="space-y-6">
            <JurorProgressMonitoring currentRound={currentRound} />
          </TabsContent>

          <TabsContent value="startup-selection" className="space-y-6">
            <StartupSelection 
              currentRound={currentRound} 
              roundInfo={currentRoundInfo}
              isReadOnly={isReadOnly}
            />
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <ResultsCommunication currentRound={currentRound} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportingDocumentation currentRound={currentRound} />
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};
export default Selection;