import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Mail, Send, AlertTriangle, CheckCircle2, Clock, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge';
import { useLifecycleStageCommunications } from '@/hooks/useLifecycleStageCommunications';
import { formatDistanceToNow } from 'date-fns';

interface LifecycleStagePanelProps {
  stage: string;
  data?: {
    stage: string;
    displayName: string;
    participantCount: number;
    emailsSent: number;
    isActive: boolean;
    hasIssues: boolean;
    substeps?: Array<{
      name: string;
      completed: number;
      total: number;
    }>;
  };
}

export const LifecycleStagePanel = ({ stage, data }: LifecycleStagePanelProps) => {
  const { 
    data: communications, 
    isLoading,
    triggerCommunication,
    isTriggering 
  } = useLifecycleStageCommunications(stage);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCommunications = communications?.filter(c => c.status === 'pending') || [];
  const failedCommunications = communications?.filter(c => c.status === 'failed') || [];

  return (
    <div className="space-y-6">
      {/* Stage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {stage === 'pre-screening' && <Mail className="h-5 w-5" />}
            {stage === 'screening-communications' && <Clock className="h-5 w-5" />}
            {stage === 'pitching-communications' && <Send className="h-5 w-5" />}
            {stage === 'finals-wrap-up' && <CheckCircle2 className="h-5 w-5" />}
            {data?.displayName || stage}
          </CardTitle>
          <CardDescription>
            {stage === 'pre-screening' && 'Onboard jurors and prepare platform access'}
            {stage === 'screening-communications' && 'Manage evaluation assignments, reminders, and results'}
            {stage === 'pitching-communications' && 'Handle pitch scheduling, meetings, and feedback'}
            {stage === 'finals-wrap-up' && 'Send final results and wrap up program communications'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Communication Substeps */}
          {data?.substeps && data.substeps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">Communication Steps</h4>
              <div className="space-y-2">
                {data.substeps.map((substep, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <span className="text-sm">{substep.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={substep.completed === substep.total ? "default" : "secondary"} className="text-xs">
                        {substep.completed}/{substep.total}
                      </Badge>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(substep.completed / substep.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{data?.participantCount || 0}</div>
              <div className="text-sm text-muted-foreground">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data?.emailsSent || 0}</div>
              <div className="text-sm text-muted-foreground">Emails Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingCommunications.length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedCommunications.length}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={() => triggerCommunication('bulk_reminder')}
              disabled={isTriggering}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send Reminders
            </Button>
            <Button 
              variant="outline" 
              onClick={() => triggerCommunication(`${stage}_results`)}
              disabled={isTriggering}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Send Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Communications</CardTitle>
          <CardDescription>
            Track email delivery status and participant engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Email Template</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communications?.map((comm) => (
                <TableRow key={comm.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{comm.participantName}</span>
                      <span className="text-sm text-muted-foreground">{comm.participantEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{comm.templateName}</span>
                      <span className="text-sm text-muted-foreground">{comm.templateCategory}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {comm.sentAt ? (
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(comm.sentAt), { addSuffix: true })}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="secondary">Not sent</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <CommunicationStatusBadge 
                      participantId={comm.participantId}
                      participantType={comm.participantType as 'startup' | 'juror'}
                      showIcon={false}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => triggerCommunication('resend', comm.id)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Resend Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!communications?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No communications found for this stage
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};