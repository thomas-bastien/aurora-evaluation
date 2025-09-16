import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMatchmakingCounts } from '@/utils/countsUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, Users, CheckCircle2, Eye, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { StartupAssignmentModal } from "@/components/matchmaking/StartupAssignmentModal";
import { AssignmentSummary } from "@/components/matchmaking/AssignmentSummary";
import { AutoAssignmentReviewPanel } from "@/components/matchmaking/AutoAssignmentReviewPanel";
import { StatusBadge } from "@/components/common/StatusBadge";
import { generateAutoAssignments, AutoAssignmentProposal, WorkloadDistribution } from '@/utils/autoAssignmentEngine';

interface Startup {
  id: string;
  name: string;
  industry: string;
  stage: string;
  description: string;
  location: string;
  founder_names: string[];
  contact_email?: string;
  status?: string;
  roundStatus?: string;
  region?: string;
  verticals?: string[];
  regions?: string[];
}

interface Juror {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  calendly_link?: string;
  preferred_regions?: string[];
  target_verticals?: string[];
  preferred_stages?: string[];
}

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

interface MatchmakingWorkflowProps {
  currentRound: 'screeningRound' | 'pitchingRound';
}

export const MatchmakingWorkflow = ({ currentRound }: MatchmakingWorkflowProps) => {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAutoAssignmentReview, setShowAutoAssignmentReview] = useState(false);
  const [autoAssignmentProposals, setAutoAssignmentProposals] = useState<AutoAssignmentProposal[]>([]);
  const [workloadDistribution, setWorkloadDistribution] = useState<WorkloadDistribution[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentRound]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Use consistent counting utilities for validation
      const counts = await getMatchmakingCounts(currentRound === 'screeningRound' ? 'screening' : 'pitching');

      // Determine which tables to use based on current round
      const assignmentTable = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';

      // First, get all startups that have assignments in this round (including historical)
      // This ensures we show all startups that have participated in the round
      const { data: assignmentStartupIds, error: assignmentIdsError } = await supabase
        .from(assignmentTable)
        .select('startup_id')
        .not('startup_id', 'is', null);

      if (assignmentIdsError) throw assignmentIdsError;

      const participatingStartupIds = [...new Set(assignmentStartupIds?.map(a => a.startup_id) || [])];

      // Fetch startups based on current round
      let startupsData, startupsError;
      
      if (currentRound === 'pitchingRound') {
        // For pitching round: ONLY show startups that were SELECTED in screening round
        const { data, error } = await supabase
          .from('startups')
          .select(`
            *,
            startup_round_statuses!inner(
              status,
              rounds!inner(name)
            )
          `)
          .eq('startup_round_statuses.rounds.name', 'screening')
          .eq('startup_round_statuses.status', 'selected');
        
        startupsData = data;
        startupsError = error;
        console.log('Filtering for pitching round: only startups selected in screening round');
      } else {
        // For screening round: show ALL startups regardless of status
        const { data, error } = await supabase.from('startups').select('*');
        startupsData = data;
        startupsError = error;
        console.log('Screening round: showing all startups');
      }

      if (startupsError) throw startupsError;

      // Fetch round-specific statuses for the current round
      const currentRoundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';
      const { data: roundStatusData, error: roundStatusError } = await supabase
        .from('startup_round_statuses')
        .select(`
          startup_id,
          status,
          rounds!inner(name)
        `)
        .eq('rounds.name', currentRoundName)
        .in('startup_id', startupsData?.map(s => s.id) || []);

      if (roundStatusError) throw roundStatusError;

      // Create a lookup for round-specific statuses
      const roundStatusLookup = roundStatusData?.reduce((acc, item) => {
        acc[item.startup_id] = item.status;
        return acc;
      }, {} as Record<string, string>) || {};

      // Fetch jurors/VCs
      const { data: jurorsData, error: jurorsError } = await supabase
        .from('jurors')
        .select('*')
        .not('user_id', 'is', null)
        .order('name');

      if (jurorsError) throw jurorsError;

      // Fetch existing assignments (only include active jurors with user_id)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from(assignmentTable)
        .select(`
          startup_id,
          juror_id,
          startups!inner(name),
          jurors!inner(name, user_id)
        `)
        .not('jurors.user_id', 'is', null);

      if (assignmentsError) throw assignmentsError;

      const mappedAssignments = assignmentsData?.map(assignment => ({
        startup_id: assignment.startup_id,
        juror_id: assignment.juror_id,
        startup_name: (assignment.startups as any).name,
        juror_name: (assignment.jurors as any).name,
      })) || [];

      console.log(`Loaded ${startupsData?.length || 0} startups for ${currentRound}${currentRound === 'pitchingRound' ? ' (selected in screening only)' : ' (all statuses)'}`);
      console.log(`Loaded ${jurorsData?.length || 0} jurors`);
      console.log(`Loaded ${mappedAssignments.length} existing assignments`);

      // Sort startups: rejected first (by name), then others (by name)
      const sortedStartups = (startupsData || []).map(startup => ({
        ...startup,
        roundStatus: roundStatusLookup[startup.id] || 'pending'
      })).sort((a, b) => {
        const aRejected = a.roundStatus === 'rejected';
        const bRejected = b.roundStatus === 'rejected';
        
        if (aRejected !== bRejected) {
          return aRejected ? 1 : -1; // Rejected startups go to bottom
        }
        
        // Within the same group, sort alphabetically by name
        return a.name.localeCompare(b.name);
      });

      setStartups(sortedStartups);
      setJurors(jurorsData || []);
      setAssignments(mappedAssignments);
    } catch (error) {
      console.error('Error fetching matchmaking data:', error);
      toast.error('Failed to load matchmaking data');
    } finally {
      setLoading(false);
    }
  };

  const getStartupAssignmentCount = (startupId: string): number => {
    return assignments.filter(assignment => assignment.startup_id === startupId).length;
  };

  const handleAssignStartup = (startup: Startup) => {
    setSelectedStartup(startup);
    setShowAssignmentModal(true);
  };

  const handleAssignmentComplete = (newAssignments: Assignment[]) => {
    setAssignments(prev => [
      ...prev.filter(a => a.startup_id !== selectedStartup?.id),
      ...newAssignments
    ]);
    setShowAssignmentModal(false);
  };

  const handleConfirmAssignments = async () => {
    try {
      // Delete all existing assignments for current startups
      const startupIds = startups.map(s => s.id);
      const assignmentTable = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
      const { error: deleteError } = await supabase
        .from(assignmentTable)
        .delete()
        .in('startup_id', startupIds);

      if (deleteError) throw deleteError;

      // Insert new assignments
      const assignmentInserts = assignments.map(assignment => ({
        startup_id: assignment.startup_id,
        juror_id: assignment.juror_id,
        status: 'assigned'
      }));

      if (assignmentInserts.length > 0) {
        const { error: insertError } = await supabase
          .from(assignmentTable)
          .insert(assignmentInserts);

        if (insertError) throw insertError;
      }

      setIsConfirmed(true);
      toast.success('All assignments have been confirmed successfully!');
      
      // If this is pitching round, send scheduling emails to selected startups
      if (currentRound === 'pitchingRound') {
        await sendPitchSchedulingEmails();
      }

    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments');
    }
  };

  // New function to send pitch scheduling emails after pitching assignments are confirmed
  const sendPitchSchedulingEmails = async () => {
    try {
      console.log('Sending pitch scheduling emails...');
      
      // Group assignments by startup
      const startupAssignments = new Map<string, Assignment[]>();
      assignments.forEach(assignment => {
        if (!startupAssignments.has(assignment.startup_id)) {
          startupAssignments.set(assignment.startup_id, []);
        }
        startupAssignments.get(assignment.startup_id)!.push(assignment);
      });

      let successCount = 0;
      
      for (const [startupId, startupAssignmentList] of startupAssignments) {
        try {
          const startup = startups.find(s => s.id === startupId);
          if (!startup || !startup.contact_email) {
            console.log(`Skipping startup ${startupId} - no email found`);
            continue;
          }

          // Get assigned jurors with their details
          const assignedJurors = startupAssignmentList
            .map(assignment => {
              const juror = jurors.find(j => j.id === assignment.juror_id);
              return juror ? {
                id: juror.id,
                name: juror.name,
                email: juror.email,
                company: juror.company || 'Investment Firm',
                calendlyLink: juror.calendly_link || '#'
              } : null;
            })
            .filter(juror => juror !== null);

          if (assignedJurors.length === 0) {
            console.log(`No valid jurors found for startup ${startup.name}`);
            continue;
          }

          // Send pitch scheduling email
          const { data, error } = await supabase.functions.invoke('send-pitch-scheduling', {
            body: {
              startupId: startup.id,
              startupName: startup.name,
              startupEmail: startup.contact_email,
              assignedJurors: assignedJurors
            }
          });

          if (error) {
            console.error(`Failed to send scheduling email to ${startup.name}:`, error);
            continue;
          }

          console.log(`Scheduling email sent successfully to ${startup.name}:`, data);
          successCount++;

        } catch (emailError) {
          console.error(`Error sending scheduling email for startup ${startupId}:`, emailError);
        }
      }

      if (successCount > 0) {
        toast.success(`Sent pitch scheduling emails to ${successCount} startups with investor calendar links!`);
      } else {
        toast.error('No scheduling emails were sent successfully');
      }

    } catch (error) {
      console.error('Error in sendPitchSchedulingEmails:', error);
      toast.error('Failed to send pitch scheduling emails');
    }
  };

  const handleViewSummary = () => {
    setShowSummary(true);
  };

  const handleAutoAssign = async () => {
    try {
      setAutoAssignLoading(true);
      
      // Find unassigned startups
      const requiredAssignments = currentRound === 'pitchingRound' ? 2 : 3;
      const unassignedStartups = startups.filter(startup => 
        startup.roundStatus !== 'rejected' && 
        getStartupAssignmentCount(startup.id) < requiredAssignments
      );

      if (unassignedStartups.length === 0) {
        toast.error('All startups are already fully assigned');
        return;
      }

      // Convert data to engine format
      const engineStartups = unassignedStartups.map(s => ({
        id: s.id,
        name: s.name,
        industry: s.industry || '',
        stage: s.stage || '',
        region: s.location || '', // Use location as region fallback
        verticals: s.industry ? [s.industry] : [],
        regions: s.location ? [s.location] : []
      }));

      const engineJurors = jurors.map(j => ({
        id: j.id,
        name: j.name,
        email: j.email,
        company: j.company,
        job_title: j.job_title,
        preferred_regions: j.preferred_regions || [],
        target_verticals: j.target_verticals || [],
        preferred_stages: j.preferred_stages || []
      }));

      // Generate auto-assignment proposals
      const roundName = currentRound === 'screeningRound' ? 'screening' : 'pitching';
      const { proposals, workloadDistribution: distribution } = await generateAutoAssignments(
        engineStartups,
        engineJurors,
        assignments,
        roundName
      );

      if (proposals.length === 0) {
        toast.error('No auto-assignments could be generated');
        return;
      }

      setAutoAssignmentProposals(proposals);
      setWorkloadDistribution(distribution);
      setShowAutoAssignmentReview(true);

      toast.success(`Generated assignments for ${proposals.length} startups`);
    } catch (error) {
      console.error('Error generating auto-assignments:', error);
      toast.error('Failed to generate auto-assignments');
    } finally {
      setAutoAssignLoading(false);
    }
  };

  const handleAutoAssignmentApprove = (newAssignments: Assignment[]) => {
    setAssignments(prev => [...prev, ...newAssignments]);
    setShowAutoAssignmentReview(false);
    toast.success(`Applied ${newAssignments.length} auto-assignments successfully`);
  };

  const handleAutoAssignmentCancel = () => {
    setShowAutoAssignmentReview(false);
    setAutoAssignmentProposals([]);
    setWorkloadDistribution([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading matchmaking data...</p>
        </div>
      </div>
    );
  }

  const hasCompleteData = startups.length > 0 && jurors.length > 0;
  const roundTitle = currentRound === 'screeningRound' ? 'Screening Round' : 'Pitching Round';
  const roundDescription = currentRound === 'screeningRound' 
    ? 'Assign 3 jurors to each startup for initial evaluation'
    : 'Assign 2-3 jurors to selected startups from Screening Round';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assign Jurors - {roundTitle}
          </CardTitle>
          <CardDescription>
            <div className="space-y-1">
              <p><strong>Community Manager Workflow:</strong> Assign jurors to startups for evaluation.</p>
              <p className="text-sm">
                {currentRound === 'screeningRound' 
                  ? 'Assign 3 jurors to each startup. Jurors will evaluate pitch decks and provide scores/feedback.' 
                  : 'Re-assign 2-3 jurors to each startup selected for Pitching Round. Jurors will join pitch calls and evaluate presentations.'
                }
              </p>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasCompleteData && (
            <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <span className="font-medium text-warning">Incomplete Data Warning</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {startups.length === 0 && currentRound === 'pitchingRound' && "No startups found for pitching round. Only startups selected in Screening Round will appear here. "}
                {startups.length === 0 && currentRound === 'screeningRound' && "No startups found for this round. "}
                {jurors.length === 0 && "No jurors available for assignment. "}
                Please ensure all required data is loaded before proceeding with assignments.
              </p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{startups.length}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentRound === 'pitchingRound' ? 'Selected Startups' : 'Startups'}
                    </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{jurors.length}</p>
                  <p className="text-sm text-muted-foreground">Available Jurors</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">
                    {startups.filter(startup => {
                      const requiredAssignments = currentRound === 'pitchingRound' ? 2 : 3;
                      return startup.roundStatus !== 'rejected' && getStartupAssignmentCount(startup.id) >= requiredAssignments;
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Fully Assigned</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-2xl font-bold">
                    {startups.filter(startup => {
                      const requiredAssignments = currentRound === 'pitchingRound' ? 2 : 3;
                      return startup.roundStatus !== 'rejected' && getStartupAssignmentCount(startup.id) < requiredAssignments;
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Need Assignment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            {/* Auto-Assign Button - Only show when there are unassigned startups */}
            {(() => {
              const requiredAssignments = currentRound === 'pitchingRound' ? 2 : 3;
              const unassignedCount = startups.filter(startup => 
                startup.roundStatus !== 'rejected' && 
                getStartupAssignmentCount(startup.id) < requiredAssignments
              ).length;
              
              return unassignedCount > 0 && (
                <Button 
                  onClick={handleAutoAssign}
                  variant="outline"
                  disabled={autoAssignLoading || jurors.length === 0}
                  className="flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  {autoAssignLoading 
                    ? 'Generating...' 
                    : `Auto-Assign Remaining (${unassignedCount})`
                  }
                </Button>
              );
            })()}

            <Button 
              onClick={handleViewSummary}
              variant="outline"
              disabled={assignments.length === 0}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Assignment Summary
            </Button>
            <Button 
              onClick={handleConfirmAssignments}
              disabled={assignments.length === 0 || isConfirmed}
              variant={isConfirmed ? "secondary" : "default"}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isConfirmed 
                ? "Assignments Confirmed" 
                : currentRound === 'pitchingRound' 
                  ? 'Confirm Assignments & Send Scheduling Emails'
                  : 'Confirm All Assignments'
              }
            </Button>
          </div>

          {/* Startups List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {currentRound === 'pitchingRound' ? 'Selected Startups' : 'All Startups'}
              {currentRound === 'screeningRound' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Including rejected startups - assignment only available for non-rejected)
                </span>
              )}
              {currentRound === 'pitchingRound' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Only startups selected from Screening Round)
                </span>
              )}
            </h3>
            {startups.map((startup) => {
              const assignmentCount = getStartupAssignmentCount(startup.id);
              const requiredAssignments = currentRound === 'pitchingRound' ? 2 : 3;
              const isFullyAssigned = assignmentCount >= requiredAssignments;

              return (
                <Card key={startup.id} className={`transition-all ${
                  startup.roundStatus === 'rejected' 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : isFullyAssigned 
                      ? 'bg-success/5 border-success/20' 
                      : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{startup.name}</h4>
                          <Badge variant={startup.industry ? "secondary" : "outline"}>
                            {startup.industry || "No Industry"}
                          </Badge>
                          <Badge variant={startup.stage ? "outline" : "secondary"}>
                            {startup.stage || "No Stage"}
                          </Badge>
                          
                          {/* Round-specific status badge using StatusBadge component */}
                          <StatusBadge status={startup.roundStatus || 'pending'} roundName={currentRound === 'screeningRound' ? 'screening' : 'pitching'} />
                          
                          <Badge variant={isFullyAssigned ? "default" : "destructive"}>
                            {assignmentCount}/{requiredAssignments} Jurors Assigned
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Location:</strong> {startup.location || "Not specified"}</p>
                          <p><strong>Founders:</strong> {startup.founder_names?.join(", ") || "Not specified"}</p>
                          <p><strong>Description:</strong> {startup.description || "No description available"}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {(() => {
                          // Determine if startup should be assignable based on round-specific status
                          const isRejected = startup.roundStatus === 'rejected';
                          
                          if (isRejected) {
                            return (
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Cannot assign jurors</p>
                                <p className="text-xs text-muted-foreground">Startup was rejected in this round</p>
                              </div>
                            );
                          }
                          
                          // Startup is assignable for any non-rejected status
                          return (
                            <Button
                              onClick={() => handleAssignStartup(startup)}
                              variant={isFullyAssigned ? "outline" : "default"}
                              size="sm"
                            >
                              {assignmentCount === 0 ? "Assign Jurors" : "Edit Assignment"}
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {startups.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No startups available for {currentRound === 'screeningRound' ? 'screening' : 'pitching'} round.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      {selectedStartup && (
        <StartupAssignmentModal
          startup={selectedStartup}
          jurors={jurors}
          existingAssignments={assignments.filter(a => a.startup_id === selectedStartup.id)}
          open={showAssignmentModal}
          onOpenChange={setShowAssignmentModal}
          onComplete={handleAssignmentComplete}
        />
      )}

      {/* Assignment Summary Modal */}
      <AssignmentSummary
        assignments={assignments}
        startups={startups}
        jurors={jurors}
        open={showSummary}
        onOpenChange={setShowSummary}
        isConfirmed={isConfirmed}
      />

      {/* Auto-Assignment Review Panel */}
      <AutoAssignmentReviewPanel
        proposals={autoAssignmentProposals}
        workloadDistribution={workloadDistribution}
        open={showAutoAssignmentReview}
        onOpenChange={setShowAutoAssignmentReview}
        onApprove={handleAutoAssignmentApprove}
        onCancel={handleAutoAssignmentCancel}
      />
    </div>
  );
};