import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CheckCircle, 
  Star, 
  Mail,
  Calendar,
  Network,
  BarChart3,
  Trophy,
  Info
} from "lucide-react";

interface WorkflowGuideProps {
  userRole: 'admin' | 'vc';
  currentRound: 'screening' | 'pitching';
}

export const WorkflowGuide = ({ userRole, currentRound }: WorkflowGuideProps) => {
  const isAdmin = userRole === 'admin';
  const isScreening = currentRound === 'screening';

  const workflows = {
    admin: {
      screening: {
        title: "Community Manager Workflow - Screening Round",
        description: "Manage the full screening process from matchmaking to selection",
        steps: [
          { icon: Network, title: "1. Matchmaking", desc: "Assign 3 jurors to each startup for evaluation" },
          { icon: CheckCircle, title: "2. Monitor Progress", desc: "Track juror evaluation completion and send reminders" },
          { icon: Star, title: "3. Make Selections", desc: "Review evaluation results and select startups for Pitching Round" },
          { icon: Mail, title: "4. Communication", desc: "Send feedback summaries and results to startup founders" }
        ]
      },
      pitching: {
        title: "Community Manager Workflow - Pitching Round",
        description: "Manage the pitching process for selected startups",
        steps: [
          { icon: Network, title: "1. Re-Matchmaking", desc: "Re-assign 2-3 jurors to selected startups from Screening Round" },
          { icon: Calendar, title: "2. Monitor Pitch Calls", desc: "Track pitch call scheduling and completion status" },
          { icon: Star, title: "3. Final Selections", desc: "Review pitching evaluations and make final startup selections" },
          { icon: Mail, title: "4. Communication", desc: "Send final results and feedback to startup founders" }
        ]
      }
    },
    vc: {
      screening: {
        title: "Juror Workflow - Screening Round",
        description: "Evaluate assigned startups through pitch deck review",
        steps: [
          { icon: Users, title: "1. Review Assignments", desc: "See startups assigned to you by Community Manager" },
          { icon: BarChart3, title: "2. Evaluate Startups", desc: "Review pitch decks, score criteria, and provide feedback" },
          { icon: CheckCircle, title: "3. Submit Evaluations", desc: "Complete and submit all assigned evaluations by deadline" }
        ]
      },
      pitching: {
        title: "Juror Workflow - Pitching Round", 
        description: "Evaluate startups through live pitch presentations",
        steps: [
          { icon: Calendar, title: "1. Set Availability", desc: "Upload your Calendly link for pitch call scheduling" },
          { icon: Users, title: "2. Join Pitch Calls", desc: "Attend scheduled pitch presentations with startups" },
          { icon: BarChart3, title: "3. Evaluate Pitches", desc: "Complete evaluation forms after each pitch presentation" },
          { icon: Trophy, title: "4. Final Assessment", desc: "Submit comprehensive evaluations to help determine final selections" }
        ]
      }
    }
  };

  const currentWorkflow = workflows[userRole][currentRound];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              {currentWorkflow.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {currentWorkflow.description}
            </p>
          </div>
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? "Community Manager" : "Juror"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {currentWorkflow.steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <step.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">{step.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Role-specific notes */}
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Important:</strong> {isAdmin 
              ? "As a Community Manager, you manage the entire selection process. Jurors only evaluate - they do not make selection decisions."
              : "As a Juror, you evaluate startups assigned to you. You do not have access to matchmaking or selection decisions - only evaluation tasks."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};