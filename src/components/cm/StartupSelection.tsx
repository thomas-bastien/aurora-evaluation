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
    <UnifiedSelectionTable 
      currentRound={roundName} 
      roundInfo={roundInfo}
      isReadOnly={isReadOnly}
      onSelectionChange={setSelectedStartupsCount}
    />
  );
};