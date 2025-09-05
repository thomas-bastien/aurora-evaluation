import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, Users, Star, MessageSquare, FileText } from "lucide-react";
import { MatchmakingWorkflow } from "@/components/cm/MatchmakingWorkflow";
import { JurorProgressMonitoring } from "@/components/cm/JurorProgressMonitoring";
import { StartupSelection } from "@/components/cm/StartupSelection";
import { ResultsCommunication } from "@/components/cm/ResultsCommunication";
import { ReportingDocumentation } from "@/components/cm/ReportingDocumentation";
const Selection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentRound, setCurrentRound] = useState<'screeningRound' | 'pitchingRound'>('screeningRound');

  // Initialize round from URL parameters - only run once on mount
  useEffect(() => {
    const roundParam = searchParams.get('round');
    console.log('Selection: useEffect triggered, roundParam:', roundParam, 'currentRound:', currentRound);
    if (roundParam === 'pitching' && currentRound !== 'pitchingRound') {
      console.log('Selection: Setting round to pitchingRound');
      setCurrentRound('pitchingRound');
    } else if (roundParam === 'screening' && currentRound !== 'screeningRound') {
      console.log('Selection: Setting round to screeningRound');
      setCurrentRound('screeningRound');
    } else if (!roundParam) {
      // No round parameter, default to screening and update URL once
      console.log('Selection: No round param, defaulting to screening');
      setSearchParams({
        round: 'screening'
      }, {
        replace: true
      });
    }
  }, [searchParams.get('round')]); // Only depend on the actual round value, not the entire searchParams object

  // Update URL when round changes (called by Select component)
  const handleRoundChange = useCallback((newRound: 'screeningRound' | 'pitchingRound') => {
    console.log('Selection: handleRoundChange called with:', newRound);
    const roundParam = newRound === 'pitchingRound' ? 'pitching' : 'screening';
    const currentRoundParam = searchParams.get('round');

    // Only update if the round is actually different
    if (currentRoundParam !== roundParam) {
      console.log('Selection: Updating URL to round:', roundParam);
      setCurrentRound(newRound);
      setSearchParams({
        round: roundParam
      }, {
        replace: true
      });
    }
  }, [searchParams, setSearchParams]);
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

        {/* Selection Tabs */}
        <Tabs defaultValue="matchmaking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="matchmaking" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Matchmaking
            </TabsTrigger>
            <TabsTrigger value="juror-progress" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Evaluations
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
            <StartupSelection currentRound={currentRound} />
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