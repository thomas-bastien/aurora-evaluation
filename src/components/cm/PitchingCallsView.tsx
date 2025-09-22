import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Users, RefreshCw, Plus, CheckCircle, XCircle, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import MeetingManagementModal from "./MeetingManagementModal";
import NewAssignmentModal from "./NewAssignmentModal";

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
  startup_id: string;
  juror_id: string;
  pitching_assignment_id: string;
  calendar_uid: string;
  event_summary: string | null;
  event_description: string | null;
  event_location: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  attendee_emails: any;
  status: string;
  created_at: string;
  updated_at: string;
  startup: {
    name: string;
    contact_email: string;
  };
  juror: {
    name: string;
    email: string;
  };
}

const PitchingCallsView = () => {
  const [assignments, setAssignments] = useState<PitchingAssignment[]>([]);
  const [cmInvitations, setCmInvitations] = useState<CMCalendarInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PitchingAssignment | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [newAssignmentModalOpen, setNewAssignmentModalOpen] = useState(false);

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

  const fetchCMInvitations = async () => {
    try {
      const { data: invitationsData, error } = await supabase
        .from('cm_calendar_invitations')
        .select(`
          *,
          startup:startups!inner(name, contact_email),
          juror:jurors!inner(name, email)
        `)
        .order('event_start_date', { ascending: false });

      if (error) throw error;

      setCmInvitations(invitationsData || []);
    } catch (error: any) {
      console.error('Error fetching CM calendar invitations:', error);
      toast.error('Failed to fetch CM calendar invitations');
    }
  };

  const updateCMInvitationStatus = async (invitationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('cm_calendar_invitations')
        .update({ status: newStatus })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success(`Meeting marked as ${newStatus}`);
      fetchCMInvitations();
    } catch (error: any) {
      console.error('Error updating CM invitation status:', error);
      toast.error('Failed to update meeting status');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAssignments(), fetchCMInvitations()]);
  };

  const handleScheduleMeeting = (assignment: PitchingAssignment) => {
    setSelectedAssignment(assignment);
    setMeetingModalOpen(true);
  };

  const handleMarkCompleted = async (assignmentId: string) => {
    try {
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
    }
  };

  const handleMarkCancelled = async (assignmentId: string) => {
    try {
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
  const scheduledMeetings = assignments.filter(
    a => a.meeting_scheduled_date && !a.meeting_completed_date && a.status !== 'cancelled'
  );
  const completedMeetings = assignments.filter(
    a => a.meeting_completed_date || a.status === 'completed'
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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

        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CM Invitations</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{cmInvitations.length}</div>
            <p className="text-xs text-muted-foreground">Calendar events received</p>
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

      {/* CM Calendar Invitations */}
      {cmInvitations.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700">Community Manager Calendar Invitations</CardTitle>
            <CardDescription>
              All pitch meeting invitations received from calendar system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Startup</TableHead>
                  <TableHead>Juror</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cmInvitations.map((invitation) => (
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
                        <div className="font-medium">{invitation.startup.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.startup.contact_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invitation.juror.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.juror.email}
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
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
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
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
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
        </Card>
      )}

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700">Pending Assignments</CardTitle>
            <CardDescription>
              These assignments need meeting scheduling
            </CardDescription>
          </CardHeader>
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
        </Card>
      )}

      {/* Scheduled Meetings */}
      {scheduledMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Meetings</CardTitle>
            <CardDescription>
              Upcoming meetings between jurors and startups
            </CardDescription>
          </CardHeader>
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Completed Meetings */}
      {completedMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Meetings</CardTitle>
            <CardDescription>
              Finished meetings with outcomes
            </CardDescription>
          </CardHeader>
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
        </Card>
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