import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { UnifiedSelectionTable } from "./UnifiedSelectionTable";
import type { Round } from "@/hooks/useRounds";

interface StartupSelectionProps {
  currentRound: 'screeningRound' | 'pitchingRound';
  roundInfo?: Round;
  isReadOnly?: boolean;
}

export const StartupSelection = ({ currentRound, roundInfo, isReadOnly }: StartupSelectionProps) => {
  const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';
  const [selectedStartupsCount, setSelectedStartupsCount] = useState(0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Make Selections - {currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round'}
              </CardTitle>
              <CardDescription>
                <div className="space-y-1">
                  <p><strong>Community Manager Workflow:</strong> Review juror evaluations and make selection decisions.</p>
                  <p className="text-sm">
                    {currentRound === 'screeningRound' 
                      ? 'Review screening evaluation scores and feedback from jurors. Select which startups advance to the Pitching Round.'
                      : 'Review pitching evaluation results from jurors after pitch calls. Make final startup selections.'
                    }
                  </p>
                </div>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={roundInfo?.status === 'completed' ? 'secondary' : 'default'}>
                {roundInfo?.status === 'active' && 'Active Round'}
                {roundInfo?.status === 'completed' && 'Completed'}
                {roundInfo?.status === 'pending' && 'Ready to Start'}
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
          <UnifiedSelectionTable 
            currentRound={roundName} 
            roundInfo={roundInfo}
            isReadOnly={isReadOnly}
            onSelectionChange={setSelectedStartupsCount}
          />
        </CardContent>
      </Card>
    </div>
  );
};