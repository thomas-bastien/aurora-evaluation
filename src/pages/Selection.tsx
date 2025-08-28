import { useState } from 'react';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Star, 
  MessageSquare, 
  FileText
} from "lucide-react";
import { JurorProgressMonitoring } from "@/components/cm/JurorProgressMonitoring";
import { StartupSelection } from "@/components/cm/StartupSelection";
import { ResultsCommunication } from "@/components/cm/ResultsCommunication";
import { ReportingDocumentation } from "@/components/cm/ReportingDocumentation";

const Selection = () => {
  const [currentPhase, setCurrentPhase] = useState<'phase1' | 'phase2'>('phase1');

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with Global Phase Toggle */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Selection</h1>
              <p className="text-lg text-muted-foreground">
                Manage the complete evaluation workflow and startup selection process
              </p>
            </div>
            
            {/* Global Phase Toggle */}
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="global-phase-toggle" className="text-sm font-medium">
                  Current Phase:
                </Label>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${currentPhase === 'phase1' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    Phase 1
                  </span>
                  <Switch
                    id="global-phase-toggle"
                    checked={currentPhase === 'phase2'}
                    onCheckedChange={(checked) => setCurrentPhase(checked ? 'phase2' : 'phase1')}
                  />
                  <span className={`text-sm ${currentPhase === 'phase2' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    Phase 2
                  </span>
                </div>
                <Badge variant={currentPhase === 'phase1' ? 'secondary' : 'default'}>
                  {currentPhase === 'phase1' ? 'Evaluations' : 'Pitches'}
                </Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Selection Tabs */}
        <Tabs defaultValue="juror-progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="juror-progress" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Juror Progress
            </TabsTrigger>
            <TabsTrigger value="startup-selection" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Startup Selection
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Results Communication
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reporting & Documentation
            </TabsTrigger>
          </TabsList>

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
    </div>
  );
};

export default Selection;