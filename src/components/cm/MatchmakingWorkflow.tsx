import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMatchmakingCounts } from '@/utils/countsUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, Users, CheckCircle2, Eye, Check, Wand2, Mail, Send, Calendar } from "lucide-react";
import { toast } from "sonner";
import { StartupAssignmentModal } from "@/components/matchmaking/StartupAssignmentModal";
import { AssignmentSummary } from "@/components/matchmaking/AssignmentSummary";
import { AutoAssignmentReviewPanel } from "@/components/matchmaking/AutoAssignmentReviewPanel";
import { SendSchedulingEmailsModal } from "@/components/cm/SendSchedulingEmailsModal";
import { AssignmentNotificationModal } from "@/components/cm/AssignmentNotificationModal";
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
  evaluation_limit?: number | null;
}

interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
  status?: string;
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
  const [isEmailsSent, setIsEmailsSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [showSchedulingEmailModal, setShowSchedulingEmailModal] = useState(false);
  const [showAssignmentNotificationModal, setShowAssignmentNotificationModal] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  
  // Communication tracking state
  const [communicationStats, setCommunicationStats] = useState({
    notificationsSent: 0,
    notificationsPending: 0,
    notificationsFailed: 0,
    engagementRate: 0
  });
  const [sendingNotifications, setSendingNotifications] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCommunicationStats();
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

      // Fetch jurors/VCs with evaluation_limit
      const { data: jurorsData, error: jurorsError } = await supabase
        .from('jurors')
        .select('id, name, email, company, job_title, calendly_link, preferred_regions, target_verticals, preferred_stages, evaluation_limit')
        .not('user_id', 'is', null)
        .order('name');

      if (jurorsError) throw jurorsError;

      // Fetch existing assignments (only include active jurors with user_id)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from(assignmentTable)
        .select(`
          startup_id,
          juror_id,
          status,
          startups!inner(name),
          jurors!inner(name, user_id)
        `)
        .not('jurors.user_id', 'is', null);

      if (assignmentsError) throw assignmentsError;

      const mappedAssignments = assignmentsData?.map(assignment => ({
        startup_id: assignment.startup_id,
        juror_id: assignment.juror_id,
        status: assignment.status,
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

  const fetchCommunicationStats = async () => {
    try {
      // Fetch communication stats for assignment notifications
      const { data: communications, error } = await supabase
        .from('email_communications')
        .select('status, opened_at, clicked_at, template_id')
        .eq('recipient_type', 'juror');

      if (error) throw error;

      const stats = {
        notificationsSent: communications?.filter(c => c.status === 'sent').length || 0,
        notificationsPending: communications?.filter(c => c.status === 'pending').length || 0,
        notificationsFailed: communications?.filter(c => c.status === 'failed').length || 0,
        engagementRate: communications?.length > 0 
          ? (communications.filter(c => c.opened_at).length / communications.length) * 100 
          : 0
      };

      setCommunicationStats(stats);
    } catch (error) {
      console.error('Error fetching communication stats:', error);
    }
  };

  const getStartupAssignmentCount = (startupId: string): number => {
    return assignments.filter(assignment => 
      assignment.startup_id === startupId && 
      assignment.status !== 'cancelled'
    ).length;
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
      // Check for under-assigned startups (< 3 jurors)
      const underAssigned = startups.filter(s => {
        const count = getStartupAssignmentCount(s.id);
        return s.roundStatus !== 'rejected' && count > 0 && count < 3;
      });

      // Show confirmation dialog if there are under-assigned startups
      if (underAssigned.length > 0) {
        const confirmMessage = `⚠️ ${underAssigned.length} startup(s) have fewer than 3 jurors assigned:\n\n${
          underAssigned.slice(0, 5).map(s => `• ${s.name} (${getStartupAssignmentCount(s.id)}/3)`).join('\n')
        }${underAssigned.length > 5 ? `\n... and ${underAssigned.length - 5} more` : ''}\n\nDo you want to proceed anyway?`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
      }

      const startupIds = startups.map(s => s.id);
      const assignmentTable = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';

      // Fetch existing assignments with full details to preserve state
      const { data: existing, error: existingError } = await supabase
        .from(assignmentTable)
        .select('*')
        .in('startup_id', startupIds);

      if (existingError) throw existingError;

      // Deduplicate existing assignments before processing
      // This handles cases where duplicate assignments exist in the database
      const deduplicatedExisting = Array.from(
        (existing || []).reduce((map, a) => {
          const key = `${a.startup_id}-${a.juror_id}`;
          // Keep the most recent one if duplicates exist
          if (!map.has(key) || new Date(a.created_at) > new Date(map.get(key).created_at)) {
            map.set(key, a);
          }
          return map;
        }, new Map<string, any>())
      ).map(([_, assignment]) => assignment);

      // Log warning if duplicates were found
      if (existing && existing.length !== deduplicatedExisting.length) {
        console.warn(`⚠️ Found ${existing.length - deduplicatedExisting.length} duplicate assignments that were automatically deduplicated`);
      }

      // Build maps/sets for diffing using deduplicated data
      const existingByKey = new Map<string, any>();
      deduplicatedExisting.forEach((a: any) => {
        const key = `${a.startup_id}-${a.juror_id}`;
        existingByKey.set(key, a);
      });

      const desiredKeys = new Set(assignments.map(a => `${a.startup_id}-${a.juror_id}`));

      const toKeep: any[] = [];
      const toInsert: { startup_id: string; juror_id: string; status: string }[] = [];
      const toCancelIds: string[] = [];
      const toDeleteIds: string[] = [];

      // Classify existing rows: keep vs remove (cancel or delete)
      deduplicatedExisting.forEach((a: any) => {
        const key = `${a.startup_id}-${a.juror_id}`;
        if (desiredKeys.has(key)) {
          toKeep.push(a);
        } else {
          const progressStatuses = ['scheduled', 'completed', 'cancelled', 'in_review'];
          const progressed = progressStatuses.includes(a.status) || !!a.meeting_scheduled_date;
          // Only cancel progressed pitching assignments; screening has no meeting context
          if (progressed && assignmentTable === 'pitching_assignments') {
            toCancelIds.push(a.id);
          } else {
            toDeleteIds.push(a.id);
          }
        }
      });

      // For pitching round: validate startups are actually selected in screening
      if (currentRound === 'pitchingRound') {
        const startupIds = assignments.map(a => a.startup_id);
        const { data: validationData, error: validationError } = await supabase
          .from('startup_round_statuses')
          .select('startup_id, status, rounds!inner(name)')
          .eq('rounds.name', 'screening')
          .eq('status', 'selected')
          .in('startup_id', startupIds);
          
        if (validationError) throw validationError;
        
        const validStartupIds = new Set(validationData?.map(v => v.startup_id) || []);
        const invalidAssignments = assignments.filter(a => !validStartupIds.has(a.startup_id));
        
        if (invalidAssignments.length > 0) {
          const invalidNames = invalidAssignments.map(a => a.startup_name).join(', ');
          toast.error(`Cannot create pitching assignments for rejected startups: ${invalidNames}`);
          throw new Error('Invalid assignments detected');
        }
      }

      // Determine inserts (desired that don't exist yet)
      const existingKeys = new Set(deduplicatedExisting.map((a: any) => `${a.startup_id}-${a.juror_id}`) || []);
      assignments.forEach(a => {
        const key = `${a.startup_id}-${a.juror_id}`;
        if (!existingKeys.has(key)) {
          toInsert.push({ startup_id: a.startup_id, juror_id: a.juror_id, status: 'assigned' });
        }
      });

      // Execute minimal changes
      if (toCancelIds.length > 0) {
        const { error: cancelError } = await supabase
          .from(assignmentTable)
          .update({ status: 'cancelled' })
          .in('id', toCancelIds);
        if (cancelError) throw cancelError;
      }

      if (toDeleteIds.length > 0) {
        const { error: deleteError } = await supabase
          .from(assignmentTable)
          .delete()
          .in('id', toDeleteIds);
        if (deleteError) throw deleteError;
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from(assignmentTable)
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      setIsConfirmed(true);
      console.log('Assignments diff result', {
        kept: toKeep.length,
        inserted: toInsert.length,
        cancelled: toCancelIds.length,
        deleted: toDeleteIds.length
      });

      const parts: string[] = [];
      if (toInsert.length) parts.push(`${toInsert.length} inserted`);
      if (toCancelIds.length) parts.push(`${toCancelIds.length} cancelled`);
      if (toDeleteIds.length) parts.push(`${toDeleteIds.length} removed`);
      if (toKeep.length) parts.push(`${toKeep.length} preserved`);
      toast.success(`Assignments updated: ${parts.join(', ')}.`);

    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments');
    }
  };

  const handleSendSchedulingEmails = (filters: { onlyConfirmed: boolean; excludeAlreadyEmailed: boolean; forceOverride?: boolean }) => {
    setShowSchedulingEmailModal(false);
    return sendPitchSchedulingEmails(filters);
  };

  // Function to send pitch scheduling emails with filtering options
  const sendPitchSchedulingEmails = async (filters?: { onlyConfirmed: boolean; excludeAlreadyEmailed: boolean; forceOverride?: boolean }) => {
    try {
      setSendingEmails(true);
      console.log('Sending pitch scheduling emails...');
      
      // Group assignments by startup
      const startupAssignments = new Map<string, Assignment[]>();
      assignments.forEach(assignment => {
        if (!startupAssignments.has(assignment.startup_id)) {
          startupAssignments.set(assignment.startup_id, []);
        }
        startupAssignments.get(assignment.startup_id)!.push(assignment);
      });

      // Filter startups based on options
      let eligibleStartupIds = Array.from(startupAssignments.keys());

      // Apply excludeAlreadyEmailed filter (unless force override is enabled)
      if (filters?.excludeAlreadyEmailed && !filters?.forceOverride) {
        const { data: emailedStartups } = await supabase
          .from('email_communications')
          .select('recipient_id')
          .eq('recipient_type', 'startup')
          .or('subject.ilike.%scheduling%,subject.ilike.%pitch%')
          .eq('status', 'sent');

        const emailedStartupIds = new Set(emailedStartups?.map(e => e.recipient_id) || []);
        eligibleStartupIds = eligibleStartupIds.filter(startupId => !emailedStartupIds.has(startupId));
      }

      let successCount = 0;
      
      for (const startupId of eligibleStartupIds) {
        const startupAssignmentList = startupAssignments.get(startupId)!;
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
        const overrideMessage = filters?.forceOverride ? ' (including previously emailed startups)' : '';
        toast.success(`Sent pitch scheduling emails to ${successCount} startups with investor calendar links${overrideMessage}!`);
        setIsEmailsSent(true);
      } else {
        toast.error('No scheduling emails were sent successfully');
      }

    } catch (error) {
      console.error('Error in sendPitchSchedulingEmails:', error);
      toast.error('Failed to send pitch scheduling emails');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleViewSummary = () => {
    setShowSummary(true);
  };

  const handleAutoAssign = async () => {
    try {
      setAutoAssignLoading(true);
      
      // Find unassigned startups
      const requiredAssignments = 3;
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
        preferred_stages: j.preferred_stages || [],
        evaluation_limit: j.evaluation_limit || null
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

  const sendAssignmentNotifications = async (filters?: { excludeAlreadyNotified: boolean }) => {
    setSendingNotifications(true);
    try {
      // Get all assigned jurors for current round
      const assignmentTable = currentRound === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
      const { data: assignmentsData, error } = await supabase
        .from(assignmentTable)
        .select(`
          juror_id,
          startups!inner(name),
          jurors!inner(name, email, user_id)
        `)
        .not('jurors.user_id', 'is', null);

      if (error) throw error;

      // Group assignments by juror
      const jurorAssignments = new Map();
      assignmentsData?.forEach(assignment => {
        const jurorId = assignment.juror_id;
        if (!jurorAssignments.has(jurorId)) {
          jurorAssignments.set(jurorId, {
            juror: assignment.jurors,
            assignments: []
          });
        }
        jurorAssignments.get(jurorId).assignments.push(assignment);
      });

      // Apply filtering if requested
      if (filters?.excludeAlreadyNotified) {
        // Query existing assignment notifications
        const { data: existingNotifications, error: notificationError } = await supabase
          .from('email_communications')
          .select(`
            recipient_id,
            metadata
          `)
          .eq('recipient_type', 'juror')
          .eq('communication_type', 'assignment-notification')
          .in('recipient_id', Array.from(jurorAssignments.keys()));

        if (notificationError) throw notificationError;

        // Create a map to track previously notified startups for each juror
        const jurorPreviousNotifications = new Map<string, Set<string>>();
        
        existingNotifications?.forEach(notification => {
          const jurorId = notification.recipient_id;
          const metadata = notification.metadata as any;
          const startupNames = metadata?.variables?.startupNames;
          
          if (startupNames && jurorId) {
            if (!jurorPreviousNotifications.has(jurorId)) {
              jurorPreviousNotifications.set(jurorId, new Set());
            }
            
            // Parse startup names from previous notifications
            const previousStartups = startupNames.split(', ');
            previousStartups.forEach((startupName: string) => {
              jurorPreviousNotifications.get(jurorId)!.add(startupName.trim());
            });
          }
        });

        // Filter out jurors who don't have new assignments
        for (const [jurorId, jurorData] of Array.from(jurorAssignments.entries())) {
          const previouslyNotifiedStartups = jurorPreviousNotifications.get(jurorId) || new Set();
          const currentStartupNames = jurorData.assignments.map((a: any) => a.startups.name);
          
          // Check if this juror has any new startups assigned since last notification
          const hasNewAssignments = currentStartupNames.some((startupName: string) => 
            !previouslyNotifiedStartups.has(startupName)
          );
          
          if (!hasNewAssignments) {
            jurorAssignments.delete(jurorId);
          }
        }
      }

      let successCount = 0;
      
      // Send notification to each juror
      for (const [jurorId, { juror, assignments }] of jurorAssignments) {
        try {
          const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
              recipientEmail: (juror as any).email,
              recipientId: jurorId,
              recipientType: 'juror',
              templateCategory: 'assignment-notification',
              variables: {
                juror_name: (juror as any).name,
                round_name: currentRound === 'screeningRound' ? 'Screening' : 'Pitching',
                assignment_count: assignments.length,
                startup_names: assignments.map((a: any) => a.startups.name).join(', '),
                platform_url: window.location.origin
              }
            }
          });

          if (error) throw error;
          successCount++;
        } catch (emailError) {
          console.error(`Failed to send notification to juror ${jurorId}:`, emailError);
        }
      }

      toast.success(`Sent assignment notifications to ${successCount}/${jurorAssignments.size} jurors`);
      fetchCommunicationStats(); // Refresh stats
    } catch (error) {
      console.error('Error sending assignment notifications:', error);
      toast.error('Failed to send assignment notifications');
    } finally {
      setSendingNotifications(false);
    }
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
    : 'Assign 3 jurors to selected startups from Screening Round';

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
                  : 'Re-assign 3 jurors to each startup selected for Pitching Round. Jurors will join pitch calls and evaluate presentations.'
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


          {/* Communication Progress */}
          {communicationStats.notificationsSent > 0 && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <span className="font-medium">Assignment Notification Progress</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-semibold text-success">{communicationStats.notificationsSent}</div>
                  <div className="text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-warning">{communicationStats.notificationsPending}</div>
                  <div className="text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-destructive">{communicationStats.notificationsFailed}</div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Original Statistics Section */}
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
                      const requiredAssignments = 3;
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
                      const count = getStartupAssignmentCount(startup.id);
                      return startup.roundStatus !== 'rejected' && count > 0 && count < 3;
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Under-Assigned (&lt;3)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            {/* Auto-Assign Button - Only show when there are unassigned startups */}
            {(() => {
              const requiredAssignments = 3;
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
              {isConfirmed ? "Assignments Confirmed" : "Confirm Assignments"}
            </Button>

            {/* Send Emails Button - Dynamic text based on round */}
            <Button 
              onClick={() => {
                if (currentRound === 'screeningRound') {
                  setShowAssignmentNotificationModal(true);
                } else {
                  setShowSchedulingEmailModal(true);
                }
              }}
              disabled={!isConfirmed || sendingEmails || sendingNotifications}
              variant={isEmailsSent ? "secondary" : "default"}
              className="flex items-center gap-2"
            >
              {sendingEmails || sendingNotifications ? (
                <>
                  <Mail className="w-4 h-4 animate-pulse" />
                  {currentRound === 'screeningRound' ? 'Sending Confirmation...' : 'Sending Scheduling...'}
                </>
              ) : isEmailsSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Emails Sent
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {currentRound === 'screeningRound' ? 'Send Confirmation Emails' : 'Send Scheduling Emails'}
                </>
              )}
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
              const requiredAssignments = 3;
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
                          
                          {/* Assignment count badge with visual warnings */}
                          {assignmentCount === 0 ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Unassigned
                            </Badge>
                          ) : assignmentCount < requiredAssignments ? (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              ⚠️ {assignmentCount}/3 jurors
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {assignmentCount} jurors
                            </Badge>
                          )}
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

      {/* Send Scheduling Emails Modal */}
      <SendSchedulingEmailsModal
        open={showSchedulingEmailModal}
        onClose={() => setShowSchedulingEmailModal(false)}
        currentRound={currentRound}
        assignments={assignments}
        onSendEmails={handleSendSchedulingEmails}
      />

      {/* Assignment Notification Modal */}
      <AssignmentNotificationModal
        open={showAssignmentNotificationModal}
        onClose={() => setShowAssignmentNotificationModal(false)}
        currentRound={currentRound}
        assignments={assignments}
        onSendNotifications={sendAssignmentNotifications}
      />
    </div>
  );
};