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
  const [currentPhase, setCurrentPhase] = useState<'screeningPhase' | 'pitchingPhase'>('screeningPhase');

  // Initialize phase from URL parameters - only run once on mount
  useEffect(() => {
    const phaseParam = searchParams.get('phase');
    console.log('Selection: useEffect triggered, phaseParam:', phaseParam, 'currentPhase:', currentPhase);
    if (phaseParam === 'pitching' && currentPhase !== 'pitchingPhase') {
      console.log('Selection: Setting phase to pitchingPhase');
      setCurrentPhase('pitchingPhase');
    } else if (phaseParam === 'screening' && currentPhase !== 'screeningPhase') {
      console.log('Selection: Setting phase to screeningPhase');
      setCurrentPhase('screeningPhase');
    } else if (!phaseParam) {
      // No phase parameter, default to screening and update URL once
      console.log('Selection: No phase param, defaulting to screening');
      setSearchParams({
        phase: 'screening'
      }, {
        replace: true
      });
    }
  }, [searchParams.get('phase')]); // Only depend on the actual phase value, not the entire searchParams object

  // Update URL when phase changes (called by Select component)
  const handlePhaseChange = useCallback((newPhase: 'screeningPhase' | 'pitchingPhase') => {
    console.log('Selection: handlePhaseChange called with:', newPhase);
    const phaseParam = newPhase === 'pitchingPhase' ? 'pitching' : 'screening';
    const currentPhaseParam = searchParams.get('phase');

    // Only update if the phase is actually different
    if (currentPhaseParam !== phaseParam) {
      console.log('Selection: Updating URL to phase:', phaseParam);
      setCurrentPhase(newPhase);
      setSearchParams({
        phase: phaseParam
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
            <MatchmakingWorkflow currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="juror-progress" className="space-y-6">
            <JurorProgressMonitoring currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="startup-selection" className="space-y-6">
            <StartupSelection currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <ResultsCommunication currentPhase={currentPhase} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportingDocumentation currentPhase={currentPhase} />
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};
export default Selection;