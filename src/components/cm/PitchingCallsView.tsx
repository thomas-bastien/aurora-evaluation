import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, ExternalLink, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ManualAssignmentModal from "./ManualAssignmentModal";

interface PitchRequest {
  id: string;
  startup_id: string | null;
  vc_id: string | null;
  pitch_date: string | null;
  status: string;
  meeting_notes: string | null;
  calendly_link: string | null;
  request_date: string | null;
  event_title: string | null;
  attendee_emails: string[] | null;
  assignment_status: string | null;
  startup: {
    name: string;
    contact_email: string;
  } | null;
  juror: {
    name: string;
    email: string;
  } | null;
}

const PitchingCallsView = () => {
  const [pitchRequests, setPitchRequests] = useState<PitchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPitchRequest, setSelectedPitchRequest] = useState<PitchRequest | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  const fetchPitchRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('pitch_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately, filtering out null values
      const startupIds = [...new Set(requests?.map(r => r.startup_id).filter(Boolean) || [])];
      const vcIds = [...new Set(requests?.map(r => r.vc_id).filter(Boolean) || [])];

      const [startupsResult, jurorsResult] = await Promise.all([
        startupIds.length > 0 
          ? supabase.from('startups').select('id, name, contact_email').in('id', startupIds)
          : Promise.resolve({ data: [] }),
        vcIds.length > 0 
          ? supabase.from('jurors').select('id, name, email, user_id').in('user_id', vcIds)
          : Promise.resolve({ data: [] })
      ]);

      const startupsMap = new Map<string, any>();
      const jurorsMap = new Map<string, any>();
      
      if (startupsResult.data) {
        startupsResult.data.forEach(s => startupsMap.set(s.id, s));
      }
      
      if (jurorsResult.data) {
        jurorsResult.data.forEach(j => jurorsMap.set(j.user_id, j));
      }

      const enrichedRequests: PitchRequest[] = requests?.map(request => ({
        id: request.id,
        startup_id: request.startup_id || null,
        vc_id: request.vc_id || null,
        pitch_date: request.pitch_date || null,
        status: request.status || 'pending',
        meeting_notes: request.meeting_notes || null,
        calendly_link: request.calendly_link || null,
        request_date: request.request_date || null,
        event_title: (request as any).event_title || null,
        attendee_emails: (request as any).attendee_emails || null,
        assignment_status: (request as any).assignment_status || 'unassigned',
        startup: request.startup_id ? startupsMap.get(request.startup_id) || null : null,
        juror: request.vc_id ? jurorsMap.get(request.vc_id) || null : null
      })) || [];

      setPitchRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching pitch requests:', error);
      toast.error('Failed to fetch pitch requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPitchRequests();
  };

  const handleAssignClick = (pitchRequest: PitchRequest) => {
    setSelectedPitchRequest(pitchRequest);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentSuccess = () => {
    fetchPitchRequests();
  };

  useEffect(() => {
    fetchPitchRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      scheduled: { variant: "default" as const, label: "Scheduled" },
      completed: { variant: "default" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAssignmentStatusBadge = (assignmentStatus: string | null) => {
    const statusConfig = {
      unassigned: { variant: "destructive" as const, label: "Unassigned" },
      assigned: { variant: "default" as const, label: "Assigned" },
      scheduled: { variant: "secondary" as const, label: "Scheduled" },
      completed: { variant: "default" as const, label: "Completed" },
    };

    const config = statusConfig[assignmentStatus as keyof typeof statusConfig] || statusConfig.unassigned;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const unassignedCalls = pitchRequests.filter(
    request => request.assignment_status === 'unassigned'
  );
  const upcomingCalls = pitchRequests.filter(
    request => request.pitch_date && new Date(request.pitch_date) > new Date() && request.status !== 'cancelled' && request.assignment_status !== 'unassigned'
  );
  const recentCalls = pitchRequests.filter(
    request => request.pitch_date && (new Date(request.pitch_date) <= new Date() || request.status === 'completed') && request.assignment_status !== 'unassigned'
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
            Automated scheduling from calendar invites
          </p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pitchRequests.length}</div>
            <p className="text-xs text-muted-foreground">All calendar events</p>
          </CardContent>
        </Card>

        <Card className={unassignedCalls.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unassignedCalls.length}</div>
            <p className="text-xs text-muted-foreground">Need manual assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCalls.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled for future</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pitchRequests.filter(r => r.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Finished calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pitchRequests.filter(r => r.assignment_status !== 'unassigned').length > 0 
                ? Math.round((pitchRequests.filter(r => r.status === 'completed').length / pitchRequests.filter(r => r.assignment_status !== 'unassigned').length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Calendar Events */}
      {unassignedCalls.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Unassigned Calendar Events</CardTitle>
            <CardDescription>
              These calendar events need manual assignment to startups and jurors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Title</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Attendees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedCalls.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.event_title || 'Untitled Event'}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {request.id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.pitch_date ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(request.pitch_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(request.pitch_date), 'h:mm a')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No date</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {request.attendee_emails && request.attendee_emails.length > 0 ? (
                          <div className="space-y-1">
                            {request.attendee_emails.slice(0, 3).map((email, index) => (
                              <div key={index} className="text-xs text-muted-foreground">
                                {email}
                              </div>
                            ))}
                            {request.attendee_emails.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{request.attendee_emails.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No attendees</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getAssignmentStatusBadge(request.assignment_status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAssignClick(request)}
                      >
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Calls */}
      {upcomingCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Calls</CardTitle>
            <CardDescription>
              Scheduled pitch sessions from calendar invites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Startup</TableHead>
                  <TableHead>Juror</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingCalls.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.startup?.name || 'Unknown Startup'}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.startup?.contact_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.juror?.name || 'Unknown Juror'}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.juror?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.pitch_date ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(request.pitch_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(request.pitch_date), 'h:mm a')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No date</span>
                      )}
                    </TableCell>
                    <TableCell>{getAssignmentStatusBadge(request.assignment_status)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.calendly_link && (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={request.calendly_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Join
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>
              Completed and past pitch sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Startup</TableHead>
                  <TableHead>Juror</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCalls.slice(0, 10).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.startup?.name || 'Unknown Startup'}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.startup?.contact_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.juror?.name || 'Unknown Juror'}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.juror?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.pitch_date ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(request.pitch_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(request.pitch_date), 'h:mm a')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No date</span>
                      )}
                    </TableCell>
                    <TableCell>{getAssignmentStatusBadge(request.assignment_status)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-48 truncate">
                        {request.meeting_notes || 'No notes'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pitchRequests.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Pitching Calls Found</CardTitle>
            <CardDescription>
              Calendar invites will automatically appear here when processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Forward calendar invites to your configured email to see them here automatically.
            </p>
          </CardContent>
        </Card>
      )}

      <ManualAssignmentModal
        pitchRequest={selectedPitchRequest}
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
};

export default PitchingCallsView;