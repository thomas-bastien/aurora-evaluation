import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Star,
  BarChart3,
  Filter
} from "lucide-react";
import { EvaluationProgressView } from "./EvaluationProgressView";
import { Top30Selection } from "./Top30Selection";

interface StartupSelectionProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const StartupSelection = ({ currentRound }: StartupSelectionProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Startup Selection - {currentRound === 'screeningRound' ? 'Screening' : 'Pitching'}
            </CardTitle>
            <CardDescription>
              {currentRound === 'screeningRound' 
                ? 'Review evaluation results and select the semi-finalists for Pitching'
                : 'Review pitch results and make final selections'
              }
            </CardDescription>
          </div>
          <Badge variant={currentRound === 'screeningRound' ? 'secondary' : 'default'}>
            {currentRound === 'screeningRound' ? 'Evaluation Results' : 'Pitch Results'}
          </Badge>
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
              {currentRound === 'screeningRound' ? 'Semi-finalist Selection' : 'Final Selection'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluation-results" className="space-y-6">
            <EvaluationProgressView />
          </TabsContent>

          <TabsContent value="top-30-selection" className="space-y-6">
            <Top30Selection />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};