import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Star,
  BarChart3,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings
} from "lucide-react";
import { EvaluationProgressView } from "./EvaluationProgressView";
import { Top30Selection } from "./Top30Selection";
import { RoundManagement } from "./RoundManagement";
import type { Round } from "@/hooks/useRounds";

interface StartupSelectionProps {
  currentRound: 'screeningRound' | 'pitchingRound';
  roundInfo?: Round;
  isReadOnly?: boolean;
}

export const StartupSelection = ({ currentRound, roundInfo, isReadOnly }: StartupSelectionProps) => {
  const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';

  return (
    <div className="space-y-6">
      {/* Round Management Section - For Active and Completed Rounds */}
      {(roundInfo?.status === 'active' || roundInfo?.status === 'completed') && (
        <RoundManagement roundName={roundName} roundInfo={roundInfo} />
      )}

      {/* Read-Only Banner for Completed/Pending Rounds */}
      {isReadOnly && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-warning">
                  {roundInfo?.status === 'completed' 
                    ? `${currentRound === 'screeningRound' ? 'Screening' : 'Pitching'} round has been completed` 
                    : `${currentRound === 'screeningRound' ? 'Screening' : 'Pitching'} round is not yet active`
                  }
                </p>
                <p className="text-sm text-warning/80">
                  You can view historical data but cannot make changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Startup Selection - {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
              </CardTitle>
              <CardDescription>
                {currentRound === 'screeningRound' 
                  ? 'Review evaluation results and select the top 30 startups for Pitching Round'
                  : 'Review pitch results and make final selections'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={roundInfo?.status === 'active' ? 'default' : 'secondary'}>
                {roundInfo?.status === 'active' && 'Active Round'}
                {roundInfo?.status === 'completed' && 'Completed'}
                {roundInfo?.status === 'pending' && 'Pending'}
              </Badge>
              {isReadOnly && (
                <Badge variant="outline" className="text-muted-foreground">
                  Read Only
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="evaluation-results" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="evaluation-results" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Evaluation Results
              </TabsTrigger>
              <TabsTrigger value="top-30-selection" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {currentRound === 'screeningRound' ? 'Top 30 Selection' : 'Final Selection'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evaluation-results" className="space-y-6">
              <EvaluationProgressView currentRound={roundName} />
            </TabsContent>

            <TabsContent value="top-30-selection" className="space-y-6">
              <Top30Selection currentRound={roundName} isReadOnly={isReadOnly} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};