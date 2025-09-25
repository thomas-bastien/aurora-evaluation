import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Mail, Phone, CheckCircle } from "lucide-react";
import { useLiveCommunicationStats } from "@/hooks/useLiveCommunicationStats";
import { useNavigate } from "react-router-dom";

export function CommunicationsOverviewCard() {
  const navigate = useNavigate();
  const { data: lifecycleData, isLoading } = useLiveCommunicationStats();

  if (isLoading) {
    return (
      <Card className="bg-gradient-primary border-primary/20 shadow-elegant">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-primary-foreground text-xl">
                  Communications Overview
                </CardTitle>
                <p className="text-primary-foreground/80 text-sm">
                  Loading participant progress...
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Get current active communication steps for progress cards
  const getCurrentSteps = () => {
    const activeStage = lifecycleData?.stages.find(s => s.isActive);
    if (!activeStage?.substeps) return [];
    
    // Return the 4 most relevant steps based on active stage
    return activeStage.substeps.slice(0, 4);
  };

  const currentSteps = getCurrentSteps();

  // Calculate progress percentage
  const getProgressPercentage = (completed: number, total: number) => {
    return Math.round((completed / total) * 100);
  };

  // Get step icon based on step name
  const getStepIcon = (stepName: string) => {
    if (stepName.includes('Invites') || stepName.includes('Notifications')) return Mail;
    if (stepName.includes('Scheduling')) return Phone;
    if (stepName.includes('Reminders')) return MessageSquare;
    if (stepName.includes('Results')) return CheckCircle;
    return Users;
  };

  // Determine next action based on current steps
  const getNextAction = () => {
    const incompleteStep = currentSteps.find(step => step.completed < step.total);
    if (incompleteStep) {
      const percentage = getProgressPercentage(incompleteStep.completed, incompleteStep.total);
      return `${incompleteStep.name}: ${percentage}% complete (${incompleteStep.completed}/${incompleteStep.total})`;
    }
    return 'All current communication steps completed';
  };

  return (
    <Card className="bg-gradient-primary border-primary/20 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-primary-foreground text-xl">
                Communications Overview
              </CardTitle>
              <p className="text-primary-foreground/80 text-sm">
                Current round communication progress
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/email-management')}
            className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
          >
            View Full Timeline
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentSteps.map((step, index) => {
            const Icon = getStepIcon(step.name);
            const percentage = getProgressPercentage(step.completed, step.total);
            const isComplete = percentage === 100;
            
            return (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isComplete ? 'text-primary-foreground' : 'text-primary-foreground/60'}`} />
                  <span className={`text-xl font-bold ${isComplete ? 'text-primary-foreground' : 'text-primary-foreground/80'}`}>
                    {percentage}%
                  </span>
                </div>
                <p className="text-xs text-primary-foreground/70 leading-tight">
                  {step.name}
                </p>
                <p className="text-xs text-primary-foreground/50 mt-1">
                  {step.completed}/{step.total}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-primary-foreground/20">
          <p className="text-sm text-primary-foreground/90">
            <span className="font-medium">Next Action:</span> {getNextAction()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}