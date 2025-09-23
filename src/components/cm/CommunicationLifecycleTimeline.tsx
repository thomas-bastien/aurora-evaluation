import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Mail, Users, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { LifecycleStagePanel } from './LifecycleStagePanel';
import { useLifecycleData } from '@/hooks/useLifecycleData';

export const CommunicationLifecycleTimeline = () => {
  const { 
    data: lifecycleData, 
    isLoading, 
    refetch: refreshData 
  } = useLifecycleData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const stages = lifecycleData?.stages || [];
  const totalParticipants = stages.reduce((sum, stage) => sum + stage.participantCount, 0);

  return (
    <div className="space-y-6">
      {/* Timeline Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Communication Lifecycle Timeline
            </CardTitle>
            <CardDescription>
              Track communication flow from juror onboarding through final results
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refreshData()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {stages.map((stage, index) => (
              <div key={stage.stage} className="flex items-center">
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                        stage.isActive 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-muted border-muted-foreground/20'
                      }`}>
                        {stage.icon}
                      </div>
                      {stage.hasIssues && (
                        <AlertCircle className="absolute -top-1 -right-1 h-4 w-4 text-destructive bg-background rounded-full" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">{stage.displayName}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {stage.participantCount} participants
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {stage.emailsSent} sent
                      </div>
                    </div>
                  </div>
                </div>
                {index < stages.length - 1 && (
                  <ArrowRight className="mx-4 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {Math.round((lifecycleData?.completedParticipants || 0) / totalParticipants * 100)}%
              </span>
            </div>
            <Progress 
              value={(lifecycleData?.completedParticipants || 0) / totalParticipants * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stage Details */}
      <Tabs defaultValue="pre-screening" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pre-screening" className="gap-2">
            <Users className="h-4 w-4" />
            Pre-Screening
          </TabsTrigger>
          <TabsTrigger value="screening-communications" className="gap-2">
            <Mail className="h-4 w-4" />
            Screening Comms
          </TabsTrigger>
          <TabsTrigger value="pitching-communications" className="gap-2">
            <Clock className="h-4 w-4" />
            Pitching Comms
          </TabsTrigger>
          <TabsTrigger value="finals-wrap-up" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Finals/Wrap-Up
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pre-screening">
          <LifecycleStagePanel 
            stage="pre-screening" 
            data={stages.find(s => s.stage === 'pre-screening')} 
          />
        </TabsContent>

        <TabsContent value="screening-communications">
          <LifecycleStagePanel 
            stage="screening-communications" 
            data={stages.find(s => s.stage === 'screening-communications')} 
          />
        </TabsContent>

        <TabsContent value="pitching-communications">
          <LifecycleStagePanel 
            stage="pitching-communications" 
            data={stages.find(s => s.stage === 'pitching-communications')} 
          />
        </TabsContent>

        <TabsContent value="finals-wrap-up">
          <LifecycleStagePanel 
            stage="finals-wrap-up" 
            data={stages.find(s => s.stage === 'finals-wrap-up')} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};