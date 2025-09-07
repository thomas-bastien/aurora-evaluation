import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Building2, TrendingUp } from "lucide-react";

interface CohortSummaryCardProps {
  totalStartups: number;
  activeJurors: number;
  activePhase: 'screening' | 'pitching';
  evaluationProgress: number;
  reminders: number;
  nextMilestone: string;
}

export const CohortSummaryCard = ({
  totalStartups,
  activeJurors,
  activePhase,
  evaluationProgress,
  reminders,
  nextMilestone
}: CohortSummaryCardProps) => {
  return (
    <Card className="bg-gradient-primary border-primary/20 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-primary-foreground text-xl">
                Aurora Tech Awards 2025 Cohort
              </CardTitle>
              <p className="text-primary-foreground/80 text-sm">
                Current Programme Cohort
              </p>
            </div>
          </div>
          <Badge 
            variant={activePhase === 'screening' ? 'secondary' : 'default'} 
            className="px-3 py-1 font-medium"
          >
            {activePhase === 'screening' ? 'Screening Phase' : 'Pitching Phase'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-2xl font-bold text-primary-foreground">
                {totalStartups}
              </span>
            </div>
            <p className="text-xs text-primary-foreground/70">Startups</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-2xl font-bold text-primary-foreground">
                {activeJurors}
              </span>
            </div>
            <p className="text-xs text-primary-foreground/70">Active Jurors</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-2xl font-bold text-primary-foreground">
                {evaluationProgress}%
              </span>
            </div>
            <p className="text-xs text-primary-foreground/70">Evaluations</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-foreground mb-1">
              {reminders}
            </div>
            <p className="text-xs text-primary-foreground/70">Reminders Sent</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-primary-foreground/20">
          <p className="text-sm text-primary-foreground/90">
            <span className="font-medium">Next Milestone:</span> {nextMilestone}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};