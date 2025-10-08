import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Building2, TrendingUp, Calendar, Mail, MessageSquare, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLiveCommunicationStats } from "@/hooks/useLiveCommunicationStats";
interface UnifiedOverviewCardProps {
  totalStartups: number;
  activeJurors: number;
  totalJurors: number;
  activeRound: 'screening' | 'pitching';
  evaluationProgress: number;
  completedEvaluations: number;
  totalEvaluations: number;
  cohortName?: string;
  deadlineInfo?: string;
  nextMilestone: string;
  userRole?: 'admin' | 'cm' | 'vc';
}
export const UnifiedOverviewCard = ({
  totalStartups,
  activeJurors,
  totalJurors,
  activeRound,
  evaluationProgress,
  completedEvaluations,
  totalEvaluations,
  cohortName = "Aurora Tech Awards 2025 Cohort",
  deadlineInfo,
  nextMilestone,
  userRole
}: UnifiedOverviewCardProps) => {
  const navigate = useNavigate();
  const {
    data: lifecycleData,
    isLoading
  } = useLiveCommunicationStats();

  // Get communication steps for current round
  const getCurrentSteps = () => {
    if (isLoading || !lifecycleData) return [];
    const stageName = activeRound === 'screening' ? 'screening-communications' : 'pitching-communications';
    const stage = lifecycleData.stages.find(s => s.stage === stageName);
    return stage?.substeps?.slice(0, 4) || [];
  };
  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round(completed / total * 100);
  };
  const extractDeadlineNumber = (deadlineInfo: string | undefined): string => {
    if (!deadlineInfo) return 'TBD';
    const match = deadlineInfo.match(/(\d+)/);
    return match ? match[1] : deadlineInfo;
  };
  const getStepIcon = (stepName: string) => {
    if (stepName.toLowerCase().includes('invite')) return Mail;
    if (stepName.toLowerCase().includes('assignment')) return Mail;
    if (stepName.toLowerCase().includes('reminder')) return MessageSquare;
    if (stepName.toLowerCase().includes('result')) return CheckCircle;
    return Mail;
  };
  const getNextAction = () => {
    const currentSteps = getCurrentSteps();
    if (currentSteps.length === 0) return "No active communications";
    const activeStep = currentSteps.find(step => step.completed < step.total);
    if (!activeStep) return "All communications complete";
    const remaining = activeStep.total - activeStep.completed;
    return `${remaining} ${activeStep.name.toLowerCase()} pending`;
  };
  const currentSteps = getCurrentSteps();
  return <Card className="bg-gradient-primary border-primary/20 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-primary-foreground text-xl">
                {cohortName}
              </CardTitle>
              <p className="text-primary-foreground/80 text-sm">
                Current Programme Cohort
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={activeRound === 'screening' ? 'secondary' : 'default'} className="px-3 py-1 font-medium">
              {activeRound === 'screening' ? 'Screening Round' : 'Pitching Round'}
            </Badge>
            {userRole === 'admin' && <Button variant="outline" size="sm" onClick={() => navigate('/email-management')} className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20">
                Comms Dashboard
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Evaluation Overview Row */}
        <div className="mb-6">
          <h4 className="text-primary-foreground/90 text-xs font-medium uppercase tracking-wide mb-3">
            Evaluation Overview
          </h4>
          <div className="grid grid-cols-4 gap-4">
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
                  {Math.round(activeJurors / totalJurors * 100)}%
                </span>
              </div>
              <p className="text-xs text-primary-foreground/70 mb-1">Active Jurors</p>
              <p className="text-xs text-primary-foreground/60">
                ({activeJurors}/{totalJurors})
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary-foreground/80" />
                <span className="text-2xl font-bold text-primary-foreground">
                  {evaluationProgress}%
                </span>
              </div>
              <p className="text-xs text-primary-foreground/70 mb-1">Evaluations</p>
              <p className="text-xs text-primary-foreground/60">
                ({completedEvaluations}/{totalEvaluations})
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary-foreground/80" />
                <span className="text-2xl font-bold text-primary-foreground">
                  {extractDeadlineNumber(deadlineInfo)}
                </span>
              </div>
              
              <p className="text-xs text-primary-foreground/60">
                Days Left
              </p>
            </div>
          </div>
        </div>

        {/* Communications Overview Row - Admin Only */}
        {userRole === 'admin' && <div>
            <h4 className="text-primary-foreground/90 text-xs font-medium uppercase tracking-wide mb-3">
              Communications Overview
            </h4>
            <div className="grid grid-cols-4 gap-4">
              {currentSteps.map((step, index) => {
            const IconComponent = getStepIcon(step.name);
            const percentage = getProgressPercentage(step.completed, step.total);
            return <div key={index} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <IconComponent className="w-4 h-4 text-primary-foreground/80" />
                      <span className="text-2xl font-bold text-primary-foreground">
                        {percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-primary-foreground/70 mb-1">
                      {step.name}
                    </p>
                    <p className="text-xs text-primary-foreground/60">
                      {step.completed}/{step.total}
                    </p>
                  </div>;
          })}

              {/* Fill empty slots if less than 4 steps */}
              {Array.from({
            length: Math.max(0, 4 - currentSteps.length)
          }).map((_, index) => <div key={`empty-${index}`} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-primary-foreground/40" />
                    <span className="text-2xl font-bold text-primary-foreground/40">
                      --
                    </span>
                  </div>
                  <p className="text-xs text-primary-foreground/40">
                    No data
                  </p>
                </div>)}
            </div>
          </div>}

        {/* Combined Footer */}
        <div className="mt-6 pt-4 border-t border-primary-foreground/20 flex items-center justify-between">
          <p className="text-sm text-primary-foreground/90">
            <span className="font-medium">Next Milestone:</span> {nextMilestone}
          </p>
          {userRole === 'admin' && <p className="text-sm text-primary-foreground/90">
              <span className="font-medium">Next Action:</span> {getNextAction()}
            </p>}
        </div>
      </CardContent>
    </Card>;
};