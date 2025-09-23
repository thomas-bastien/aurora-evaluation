import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Mail, 
  MailCheck, 
  Eye, 
  MousePointer, 
  AlertTriangle, 
  Clock,
  CheckCircle2
} from "lucide-react";

interface CommunicationStatusBadgeProps {
  participantId: string;
  participantType: 'juror' | 'startup';
  stage?: string;
  className?: string;
  showIcon?: boolean;
}

interface WorkflowStatus {
  workflow_id: string;
  current_stage: string;
  stage_status: string;
  stage_entered_at: string;
  stage_completed_at?: string;
  next_action_due?: string;
}

interface LatestCommunication {
  id: string;
  subject: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  created_at: string;
}

export function CommunicationStatusBadge({ 
  participantId, 
  participantType, 
  stage,
  className = "",
  showIcon = true
}: CommunicationStatusBadgeProps) {
  
  // Get workflow status
  const { data: workflowStatus } = useQuery({
    queryKey: ["workflow-status", participantId, participantType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_participant_workflow_status', {
        p_participant_id: participantId,
        p_participant_type: participantType
      });

      if (error) {
        console.error('Error fetching workflow status:', error);
        return null;
      }

      return data?.[0] as WorkflowStatus | null;
    },
  });

  // Get latest communication
  const { data: latestComm } = useQuery({
    queryKey: ["latest-communication", participantId, participantType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_communications")
        .select("*")
        .eq("recipient_id", participantId)
        .eq("recipient_type", participantType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching latest communication:', error);
        return null;
      }

      return data as LatestCommunication | null;
    },
  });

  const getStatusInfo = () => {
    if (!workflowStatus && !latestComm) {
      return {
        text: "No Contact",
        variant: "outline" as const,
        icon: Clock,
        tooltip: "No communication sent yet",
      };
    }

    if (latestComm) {
      // Determine status based on latest communication
      if (latestComm.clicked_at) {
        return {
          text: "Engaged",
          variant: "default" as const,
          icon: MousePointer,
          tooltip: `Clicked email on ${format(new Date(latestComm.clicked_at), 'MMM d, HH:mm')}`,
        };
      }
      
      if (latestComm.opened_at) {
        return {
          text: "Opened",
          variant: "default" as const,
          icon: Eye,
          tooltip: `Opened email on ${format(new Date(latestComm.opened_at), 'MMM d, HH:mm')}`,
        };
      }
      
      if (latestComm.delivered_at) {
        return {
          text: "Delivered",
          variant: "secondary" as const,
          icon: MailCheck,
          tooltip: `Email delivered on ${format(new Date(latestComm.delivered_at), 'MMM d, HH:mm')}`,
        };
      }
      
      if (latestComm.status === 'sent') {
        return {
          text: "Sent",
          variant: "secondary" as const,
          icon: Mail,
          tooltip: `Email sent on ${format(new Date(latestComm.sent_at || latestComm.created_at), 'MMM d, HH:mm')}`,
        };
      }
      
      if (latestComm.bounced_at || latestComm.status === 'bounced') {
        return {
          text: "Bounced",
          variant: "destructive" as const,
          icon: AlertTriangle,
          tooltip: `Email bounced on ${format(new Date(latestComm.bounced_at || latestComm.created_at), 'MMM d, HH:mm')}`,
        };
      }
      
      if (latestComm.status === 'failed') {
        return {
          text: "Failed",
          variant: "destructive" as const,
          icon: AlertTriangle,
          tooltip: "Email delivery failed",
        };
      }
    }

    if (workflowStatus) {
      if (workflowStatus.stage_status === 'completed') {
        return {
          text: "Complete",
          variant: "default" as const,
          icon: CheckCircle2,
          tooltip: `Stage completed on ${format(new Date(workflowStatus.stage_completed_at!), 'MMM d, HH:mm')}`,
        };
      }
      
      return {
        text: "In Progress",
        variant: "secondary" as const,
        icon: Clock,
        tooltip: `Current stage: ${workflowStatus.current_stage.replace('_', ' ')}`,
      };
    }

    return {
      text: "Pending",
      variant: "outline" as const,
      icon: Clock,
      tooltip: "Communication pending",
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={statusInfo.variant} className={`flex items-center gap-1 ${className}`}>
            {showIcon && <Icon className="w-3 h-3" />}
            {statusInfo.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusInfo.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}