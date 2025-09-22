import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, Users, RefreshCw, Plus, CheckCircle, XCircle, Calendar as CalendarIcon, ChevronDown, ChevronUp, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import MeetingManagementModal from "./MeetingManagementModal";
import NewAssignmentModal from "./NewAssignmentModal";
import ManualMatchingDropdowns from "./ManualMatchingDropdowns";

interface PitchingAssignment {
  id: string;
  startup_id: string;
  juror_id: string;
  status: string;
  meeting_scheduled_date: string | null;
  meeting_completed_date: string | null;
  meeting_notes: string | null;
  calendly_link: string | null;
  created_at: string;
  startup: {
    name: string;
    contact_email: string;
  };
  juror: {
    name: string;
    email: string;
  };
}

interface CMCalendarInvitation {
  id: string;
  startup_id: string | null;
  juror_id: string | null;
  pitching_assignment_id: string | null;
  calendar_uid: string;
  event_summary: string | null;
  event_description: string | null;
  event_location: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  attendee_emails: any;
  status: string;
  matching_status: string;
  matching_errors: any;
  manual_assignment_needed: boolean;
  event_method: string | null;
  sequence_number: number | null;
  previous_event_date: string | null;
  lifecycle_history: any;
  created_at: string;
  updated_at: string;
  startup?: {
    name: string;
    contact_email: string;
  } | null;
  juror?: {
    name: string;
    email: string;
  } | null;
}

const PitchingCallsView = () => {
  const [assignments, setAssignments] = useState<PitchingAssignment[]>([]);
  const [cmInvitations, setCmInvitations] = useState<CMCalendarInvitation[]>([]);
  const [allStartups, setAllStartups] = useState<any[]>([]);
  const [allJurors, setAllJurors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PitchingAssignment | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [newAssignmentModalOpen, setNewAssignmentModalOpen] = useState(false);

  // Collapsible sections state with localStorage persistence
  const [sectionCollapseState, setSectionCollapseState] = useState(() => {
    try {
      const saved = localStorage.getItem('cm-pitching-calls-collapse-state');
      return saved ? JSON.parse(saved) : {
        calendarInvitations: true,        // Collapsed by default (renamed section)
        unmatchedInvitations: false,      // Always expanded
        rescheduledInvitations: false,    // Expanded if items exist
        cancelledInvitations: true,       // Collapsed by default
        pendingAssignments: false,        // Expanded if items exist
        scheduledMeetings: true,          // Collapsed by default
        completedMeetings: true           // Collapsed by default
      };
    } catch {
      return {
        calendarInvitations: true,
        unmatchedInvitations: false,
        rescheduledInvitations: false,
        cancelledInvitations: true,
        pendingAssignments: false,
        scheduledMeetings: true,
        completedMeetings: true
      };
    }
  });

  // Update localStorage when collapse state changes
  useEffect(() => {
    localStorage.setItem('cm-pitching-calls-collapse-state', JSON.stringify(sectionCollapseState));
  }, [sectionCollapseState]);

  const toggleSection = (sectionKey: string) => {
    setSectionCollapseState(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const expandAll = () => {
    setSectionCollapseState(prev => 
      Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {})
    );
  };

  const collapseAll = () => {
    setSectionCollapseState(prev => 
      Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
  };

  const fetchAssignments = async () => {
    try {
      const { data: assignmentsData, error } = await supabase
        .from('pitching_assignments')
        .select(`
          *,
          startup:startups!inner(name, contact_email),
          juror:jurors!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssignments(assignmentsData || []);
    } catch (error: any) {
      console.error('Error fetching pitching assignments:', error);
      toast.error('Failed to fetch pitching assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to map internal statuses to user-friendly display labels
  const getDisplayStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'scheduled': 'Invited',     // Calendar invitation sent, pending acceptance
      'confirmed': 'Confirmed',   // Invitation accepted/confirmed
      'completed': 'Completed',   // Meeting completed
      'cancelled': 'Cancelled',   // Invitation cancelled
      'rescheduled': 'Rescheduled', // Invitation rescheduled
      'pending': 'Pending'        // Default pending state
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Context-aware status function for scheduled meetings section
  const getScheduledDisplayStatus = (status: string): string => {
    if (status === 'completed') {
      return 'Scheduled'; // Accepted invitations show as "Scheduled" in the scheduled section
    }
    return getDisplayStatus(status);
  };

  const fetchCMInvitations = async () => {
    try {
      const { data: invitationsData, error } = await supabase
        .from('cm_calendar_invitations')
        .select(`
          *,
          startup:startups(name, contact_email),
          juror:jurors(name, email)
        `)
        .order('event_start_date', { ascending: false });

      if (error) throw error;

      setCmInvitations(invitationsData || []);
    } catch (error: any) {
      console.error('Error fetching CM calendar invitations:', error);
      toast.error('Failed to fetch CM calendar invitations');
    }
  };

  const fetchAllStartupsAndJurors = async () => {
    try {
      const [startupsResponse, jurorsResponse] = await Promise.all([
        supabase.from('startups').select('id, name, contact_email').order('name'),
        supabase.from('jurors').select('id, name, email').order('name')
      ]);

      if (startupsResponse.error) throw startupsResponse.error;
      if (jurorsResponse.error) throw jurorsResponse.error;

      setAllStartups(startupsResponse.data || []);
      setAllJurors(jurorsResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching startups and jurors:', error);
    }
  };

  const updateCMInvitationStatus = async (invitationId: string, newStatus: string) => {
    try {
      // Optimistically update the local state for immediate UI feedback
      setCmInvitations(prev => prev.map(inv => 
        inv.id === invitationId ? { ...inv, status: newStatus } : inv
      ));

      const { error } = await supabase
        .from('cm_calendar_invitations')
        .update({ status: newStatus })
        .eq('id', invitationId);

      if (error) throw error;

      const message = newStatus === 'completed' ? 'Meeting invitation accepted' : `Meeting marked as ${newStatus}`;
      toast.success(message);
      // Refresh to get the latest data from server
      fetchCMInvitations();
    } catch (error: any) {
      console.error('Error updating CM invitation status:', error);
      toast.error('Failed to update meeting status');
      // Revert optimistic update on error
      fetchCMInvitations();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAssignments(), fetchCMInvitations(), fetchAllStartupsAndJurors()]);
  };

  const handleManualMatch = async (invitationId: string, startupId: string, jurorId: string) => {
    try {
      // Create pitching assignment if one doesn't exist
      const { data: existingAssignment } = await supabase
        .from('pitching_assignments')
        .select('id')
        .eq('startup_id', startupId)
        .eq('juror_id', jurorId)
        .maybeSingle();

      let assignmentId = existingAssignment?.id;

      if (!assignmentId) {
        // Get the invitation details for the assignment
        const invitation = cmInvitations.find(inv => inv.id === invitationId);
        
        const { data: newAssignment, error: createError } = await supabase
          .from('pitching_assignments')
          .insert({
            startup_id: startupId,
            juror_id: jurorId,
            meeting_scheduled_date: invitation?.event_start_date,
            calendly_link: invitation?.event_location,
            meeting_notes: invitation?.event_description,
            status: 'scheduled'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        assignmentId = newAssignment.id;
      }

      // Update the CM calendar invitation
      const { error: updateError } = await supabase
        .from('cm_calendar_invitations')
        .update({
          startup_id: startupId,
          juror_id: jurorId,
          pitching_assignment_id: assignmentId,
          matching_status: 'manual_matched',
          manual_assignment_needed: false,
          status: 'scheduled'
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      toast.success('Meeting manually matched successfully');
      handleRefresh();
    } catch (error: any) {
      console.error('Error manually matching meeting:', error);
      toast.error('Failed to manually match meeting');
    }
  };

  const handleScheduleMeeting = (assignment: PitchingAssignment) => {
    setSelectedAssignment(assignment);
    setMeetingModalOpen(true);
  };

  const handleMarkCompleted = async (assignmentId: string) => {
    try {
      // Optimistically update the local state
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId ? { 
          ...assignment, 
          status: 'completed',
          meeting_completed_date: new Date().toISOString()
        } : assignment
      ));

      const { error } = await supabase
        .from('pitching_assignments')
        .update({
          status: 'completed',
          meeting_completed_date: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Meeting marked as completed');
      fetchAssignments();
    } catch (error: any) {
      console.error('Error marking meeting as completed:', error);
      toast.error('Failed to mark meeting as completed');
      fetchAssignments(); // Revert on error
    }
  };

  const handleMarkCancelled = async (assignmentId: string) => {
    try {
      // Optimistically update the local state
      setAssignments(prev => prev.map(assignment => 
        assignment.id === assignmentId ? { 
          ...assignment, 
          status: 'cancelled'
        } : assignment
      ));

      const { error } = await supabase
        .from('pitching_assignments')
        .update({
          status: 'cancelled'
        })
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Meeting marked as cancelled');
      fetchAssignments();
    } catch (error: any) {
      console.error('Error marking meeting as cancelled:', error);
      toast.error('Failed to mark meeting as cancelled');
      fetchAssignments(); // Revert on error
    }
  };

  const handleMeetingUpdate = () => {
    fetchAssignments();
  };

  const handleNewAssignment = () => {
    fetchAssignments();
  };

  useEffect(() => {
    fetchAssignments();
    fetchCMInvitations();
    fetchAllStartupsAndJurors();
  }, []);

  const getStatusBadge = (assignment: PitchingAssignment) => {
    if (assignment.meeting_completed_date) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    }
    if (assignment.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (assignment.meeting_scheduled_date) {
      return <Badge variant="secondary">Scheduled</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  // Filter assignments by status
  const pendingAssignments = assignments.filter(
    a => a.status === 'assigned' && !a.meeting_scheduled_date && !a.meeting_completed_date
  );
  const baseScheduledMeetings = assignments.filter(
    a => a.meeting_scheduled_date && !a.meeting_completed_date && a.status !== 'cancelled'
  );
  
  // Get completed CM invitations
  const completedInvitations = cmInvitations.filter(inv => inv.status === 'completed');
  
  // Deduplicate scheduled meetings by startup-juror pair, prioritizing CM invitations (more recent)
  const scheduledMeetingsMap = new Map();
  
  // First add pitching assignments
  baseScheduledMeetings.forEach(assignment => {
    const key = `${assignment.startup_id}-${assignment.juror_id}`;
    scheduledMeetingsMap.set(key, { type: 'assignment', data: assignment });
  });
  
  // Then add/override with CM invitations (they take priority as they're more recent)
  completedInvitations.forEach(invitation => {
    const key = `${invitation.startup_id}-${invitation.juror_id}`;
    scheduledMeetingsMap.set(key, { type: 'invitation', data: invitation });
  });
  
  // Extract the deduplicated scheduled meetings
  const scheduledMeetings = Array.from(scheduledMeetingsMap.values())
    .filter(item => item.type === 'assignment')
    .map(item => item.data);
  
  // Extract the deduplicated completed invitations
  const deduplicatedCompletedInvitations = Array.from(scheduledMeetingsMap.values())
    .filter(item => item.type === 'invitation')
    .map(item => item.data);
  const completedMeetings = assignments.filter(
    a => a.meeting_completed_date || a.status === 'completed'
  );

  // Filter invitations by matching status and lifecycle
  const matchedInvitations = cmInvitations.filter(inv => 
    (inv.matching_status === 'auto_matched' || inv.matching_status === 'manual_matched') && 
    inv.status !== 'cancelled' && inv.status !== 'completed'
  );
  const unmatchedInvitations = cmInvitations.filter(inv => inv.manual_assignment_needed);
  const rescheduledInvitations = cmInvitations.filter(inv => 
    inv.matching_status === 'rescheduled' || inv.status === 'rescheduled'
  );
  const cancelledInvitations = cmInvitations.filter(inv => 
    inv.matching_status === 'cancelled' || inv.status === 'cancelled'
  );
  const conflictInvitations = cmInvitations.filter(inv => 
    inv.matching_status === 'conflict' || inv.status === 'conflict'
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Pitching Calls</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pitching Calls</h2>
          <p className="text-muted-foreground">
            Manage juror-startup meetings and assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={expandAll}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Expand All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={collapseAll}
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            Collapse All
          </Button>
          <Button 
            onClick={() => setNewAssignmentModalOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">All juror-startup pairs</p>
          </CardContent>
        </Card>

        <Card className={rescheduledInvitations.length > 0 ? "border-yellow-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rescheduled</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{rescheduledInvitations.length}</div>
            <p className="text-xs text-muted-foreground">Need approval</p>
          </CardContent>
        </Card>

        <Card className={unmatchedInvitations.length > 0 ? "border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unmatchedInvitations.length}</div>
            <p className="text-xs text-muted-foreground">Need manual match</p>
          </CardContent>
        </Card>

        <Card className={pendingAssignments.length > 0 ? "border-orange-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingAssignments.length}</div>
            <p className="text-xs text-muted-foreground">Need scheduling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Meetings planned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Meetings done</p>
          </CardContent>
        </Card>
      </div>

      {/* Unmatched Calendar Meetings - Manual Matching Required */}
      {unmatchedInvitations.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Unmatched Calendar Meetings</CardTitle>
            <CardDescription>
              These meetings need manual matching to startups and jurors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Details</TableHead>
                  <TableHead>Attendee Emails</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Matching Errors</TableHead>
                  <TableHead>Manual Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmatchedInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invitation.event_summary || 'Pitch Meeting'}</div>
                        {invitation.event_location && (
                          <div className="text-sm text-muted-foreground">
                            📍 {invitation.event_location}
                          </div>
                        )}
                        {invitation.event_description && (
                          <div className="text-sm text-muted-foreground">
                            {invitation.event_description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {Array.isArray(invitation.attendee_emails) ? 
                          invitation.attendee_emails.map((email: string, i: number) => (
                            <div key={i} className="text-muted-foreground">{email}</div>
                          )) :
                          <div className="text-muted-foreground">No attendees</div>
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      {invitation.event_start_date ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(invitation.event_start_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(invitation.event_start_date), 'h:mm a')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No date</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {Array.isArray(invitation.matching_errors) && invitation.matching_errors.length > 0 ? 
                          invitation.matching_errors.map((error: string, i: number) => (
                            <div key={i} className="text-red-600">{error}</div>
                          )) :
                          <div className="text-muted-foreground">No errors</div>
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <ManualMatchingDropdowns
                        invitationId={invitation.id}
                        allStartups={allStartups}
                        allJurors={allJurors}
                        onMatch={handleManualMatch}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Calendar Invitations */}
      {matchedInvitations.length > 0 && (
        <Collapsible open={!sectionCollapseState.calendarInvitations} onOpenChange={() => toggleSection('calendarInvitations')}>
          <Card className="border-blue-200">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-blue-700 flex items-center gap-2">
                      Calendar Invitations ({matchedInvitations.length} items)
                      {sectionCollapseState.calendarInvitations ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </CardTitle>
                    <CardDescription>
                      Pitch meeting invitations that were automatically or manually matched
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Startup</TableHead>
                      <TableHead>Juror</TableHead>
                      <TableHead>Event Date</TableHead>
                      <TableHead>Match Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invitation.event_summary || 'Pitch Meeting'}</div>
                            {invitation.event_location && (
                              <div className="text-sm text-muted-foreground">
                                📍 {invitation.event_location}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invitation.startup?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {invitation.startup?.contact_email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invitation.juror?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {invitation.juror?.email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invitation.event_start_date ? (
                            <div>
                              <div className="font-medium">
                                {format(new Date(invitation.event_start_date), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(invitation.event_start_date), 'h:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              invitation.matching_status === 'auto_matched' ? 'bg-green-100 text-green-800 border-green-200' :
                              invitation.matching_status === 'manual_matched' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''
                            }
                          >
                            {invitation.matching_status === 'auto_matched' ? 'Auto' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              invitation.status === 'completed' ? 'default' :
                              invitation.status === 'cancelled' ? 'destructive' :
                              invitation.status === 'rescheduled' ? 'secondary' : 'outline'
                            }
                            className={
                              invitation.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                              invitation.status === 'scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              invitation.status === 'rescheduled' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''
                            }
                          >
                            {getDisplayStatus(invitation.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {invitation.status !== 'completed' && invitation.status !== 'cancelled' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateCMInvitationStatus(invitation.id, 'completed')}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Accept
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateCMInvitationStatus(invitation.id, 'rescheduled')}
                                >
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Reschedule
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateCMInvitationStatus(invitation.id, 'cancelled')}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Rescheduled Calendar Meetings - Need Approval */}
      {rescheduledInvitations.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-700">Rescheduled Calendar Meetings</CardTitle>
            <CardDescription>
              These meetings have been rescheduled and may need approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Startup</TableHead>
                  <TableHead>Juror</TableHead>
                  <TableHead>Previous Date</TableHead>
                  <TableHead>New Date</TableHead>
                  <TableHead>Lifecycle History</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rescheduledInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invitation.event_summary || 'Pitch Meeting'}</div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Rescheduled
                          </Badge>
                          {invitation.event_method && (
                            <Badge variant="secondary" className="text-xs">
                              {invitation.event_method}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invitation.startup?.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.startup?.contact_email || 'No email'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invitation.juror?.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.juror?.email || 'No email'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {invitation.previous_event_date ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(invitation.previous_event_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(invitation.previous_event_date), 'h:mm a')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {invitation.event_start_date ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(invitation.event_start_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(invitation.event_start_date), 'h:mm a')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No date</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {Array.isArray(invitation.lifecycle_history) && invitation.lifecycle_history.length > 0 ? 
                          <div className="max-h-16 overflow-y-auto">
                            {invitation.lifecycle_history.slice(-3).map((entry: any, i: number) => (
                              <div key={i} className="text-xs text-muted-foreground mb-1">
                                {entry.action} - {entry.timestamp ? format(new Date(entry.timestamp), 'MMM dd HH:mm') : 'Unknown time'}
                              </div>
                            ))}
                          </div> :
                          <div className="text-muted-foreground">No history</div>
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateCMInvitationStatus(invitation.id, 'scheduled')}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateCMInvitationStatus(invitation.id, 'cancelled')}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Calendar Meetings */}
      {cancelledInvitations.length > 0 && (
        <Collapsible open={!sectionCollapseState.cancelledInvitations} onOpenChange={() => toggleSection('cancelledInvitations')}>
          <Card className="border-gray-200">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-700 flex items-center gap-2">
                      Cancelled Calendar Meetings ({cancelledInvitations.length} items)
                      {sectionCollapseState.cancelledInvitations ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </CardTitle>
                    <CardDescription>
                      Meetings that have been cancelled by participants
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Startup</TableHead>
                      <TableHead>Juror</TableHead>
                      <TableHead>Original Date</TableHead>
                      <TableHead>Cancelled Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancelledInvitations.map((invitation) => (
                      <TableRow key={invitation.id} className="opacity-75">
                        <TableCell>
                          <div>
                            <div className="font-medium line-through">{invitation.event_summary || 'Pitch Meeting'}</div>
                            <Badge variant="destructive" className="mt-1">
                              Cancelled
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invitation.startup?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {invitation.startup?.contact_email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invitation.juror?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {invitation.juror?.email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invitation.event_start_date ? (
                            <div>
                              <div className="font-medium line-through">
                                {format(new Date(invitation.event_start_date), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground line-through">
                                {format(new Date(invitation.event_start_date), 'h:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invitation.updated_at ? (
                            <div>
                              <div className="font-medium">
                                {format(new Date(invitation.updated_at), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(invitation.updated_at), 'h:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateCMInvitationStatus(invitation.id, 'scheduled')}
                          >
                            Reschedule
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <Collapsible open={!sectionCollapseState.pendingAssignments} onOpenChange={() => toggleSection('pendingAssignments')}>
          <Card className="border-orange-200">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-orange-700 flex items-center gap-2">
                      Pending Assignments ({pendingAssignments.length} items)
                      {sectionCollapseState.pendingAssignments ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </CardTitle>
                    <CardDescription>
                      These assignments need meeting scheduling
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Startup</TableHead>
                      <TableHead>Juror</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.startup.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.startup.contact_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.juror.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.juror.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(assignment.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{getStatusBadge(assignment)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleScheduleMeeting(assignment)}
                            >
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              Schedule
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Scheduled Meetings */}
      {(scheduledMeetings.length > 0 || deduplicatedCompletedInvitations.length > 0) && (
        <Collapsible open={!sectionCollapseState.scheduledMeetings} onOpenChange={() => toggleSection('scheduledMeetings')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Scheduled Meetings ({scheduledMeetings.length + deduplicatedCompletedInvitations.length} items)
                      {sectionCollapseState.scheduledMeetings ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </CardTitle>
                    <CardDescription>
                      Upcoming meetings between jurors and startups
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Startup</TableHead>
                      <TableHead>Juror</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledMeetings.map((assignment) => (
                      <TableRow key={`assignment-${assignment.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.startup.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.startup.contact_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.juror.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.juror.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.meeting_scheduled_date ? (
                            <div>
                              <div className="font-medium">
                                {format(new Date(assignment.meeting_scheduled_date), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(assignment.meeting_scheduled_date), 'h:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No date</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(assignment)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleScheduleMeeting(assignment)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleMarkCompleted(assignment.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleMarkCancelled(assignment.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {deduplicatedCompletedInvitations.map((invitation) => (
                      <TableRow key={`invitation-${invitation.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invitation.startup?.name || 'Unknown Startup'}</div>
                            <div className="text-sm text-muted-foreground">
                              {invitation.startup?.contact_email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invitation.juror?.name || 'Unknown Juror'}</div>
                            <div className="text-sm text-muted-foreground">
                              {invitation.juror?.email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invitation.event_start_date ? (
                            <div>
                              <div className="font-medium">
                                {format(new Date(invitation.event_start_date), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(invitation.event_start_date), 'h:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="default" 
                            className={
                              invitation.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200'
                            }
                          >
                            {getScheduledDisplayStatus(invitation.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateCMInvitationStatus(invitation.id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateCMInvitationStatus(invitation.id, 'cancelled')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Completed Meetings */}
      {completedMeetings.length > 0 && (
        <Collapsible open={!sectionCollapseState.completedMeetings} onOpenChange={() => toggleSection('completedMeetings')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Completed Meetings ({completedMeetings.length} items)
                      {sectionCollapseState.completedMeetings ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </CardTitle>
                    <CardDescription>
                      Finished meetings with outcomes
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Startup</TableHead>
                      <TableHead>Juror</TableHead>
                      <TableHead>Completed Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedMeetings.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.startup.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.startup.contact_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.juror.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.juror.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.meeting_completed_date ? (
                            <div>
                              <div className="font-medium">
                                {format(new Date(assignment.meeting_completed_date), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(assignment.meeting_completed_date), 'h:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No date</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(assignment)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleScheduleMeeting(assignment)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* No assignments message */}
      {assignments.length === 0 && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pitching Assignments Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first assignment to start managing juror-startup meetings
              </p>
              <Button onClick={() => setNewAssignmentModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <MeetingManagementModal
        assignment={selectedAssignment}
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        onSuccess={handleMeetingUpdate}
      />

      <NewAssignmentModal
        isOpen={newAssignmentModalOpen}
        onClose={() => setNewAssignmentModalOpen(false)}
        onSuccess={handleNewAssignment}
      />
    </div>
  );
};

export default PitchingCallsView;