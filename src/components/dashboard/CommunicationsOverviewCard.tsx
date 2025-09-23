import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Mail, Phone, CheckCircle } from "lucide-react";
import { useLifecycleData } from "@/hooks/useLifecycleData";
import { useNavigate } from "react-router-dom";

export function CommunicationsOverviewCard() {
  const navigate = useNavigate();
  const { data: lifecycleData, isLoading } = useLifecycleData();

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

  // Extract participant counts from lifecycle data
  const preScreeningCount = lifecycleData?.stages.find(s => s.stage === 'pre_screening')?.participantCount || 0;
  const screeningCount = lifecycleData?.stages.find(s => s.stage === 'screening_communications')?.participantCount || 0;
  const pitchingCount = lifecycleData?.stages.find(s => s.stage === 'pitching_communications')?.participantCount || 0;
  const finalsCount = lifecycleData?.stages.find(s => s.stage === 'finals_wrap_up')?.participantCount || 0;

  // Determine next action based on current communication stage
  const getNextAction = () => {
    if (preScreeningCount > 0 && screeningCount === 0) {
      return `Send juror invitations to ${preScreeningCount} participants`;
    }
    if (screeningCount > pitchingCount) {
      return `Send screening assignments to ${screeningCount - pitchingCount} jurors`;
    }
    if (pitchingCount > finalsCount) {
      return `Send pitch scheduling to ${pitchingCount - finalsCount} participants`;
    }
    return "All communications up to date";
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
                Participant progress through communication lifecycle
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
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-2xl font-bold text-primary-foreground">
                {preScreeningCount}
              </span>
            </div>
            <p className="text-xs text-primary-foreground/70">Jurors Onboarded</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-2xl font-bold text-primary-foreground">
                {screeningCount}
              </span>
            </div>
            <p className="text-xs text-primary-foreground/70">In Screening</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-2xl font-bold text-primary-foreground">
                {pitchingCount}
              </span>
            </div>
            <p className="text-xs text-primary-foreground/70">In Pitching</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-2xl font-bold text-primary-foreground">
                {finalsCount}
              </span>
            </div>
            <p className="text-xs text-primary-foreground/70">In Finals</p>
          </div>
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