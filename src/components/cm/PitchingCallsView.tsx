import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, ExternalLink, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PitchRequest {
  id: string;
  startup_id: string;
  vc_id: string;
  pitch_date: string;
  status: string;
  meeting_notes: string | null;
  calendly_link: string | null;
  request_date: string;
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

  const fetchPitchRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('pitch_requests')
        .select('*')
        .order('pitch_date', { ascending: true });

      if (error) throw error;

      // Fetch related data separately
      const startupIds = [...new Set(requests?.map(r => r.startup_id) || [])];
      const vcIds = [...new Set(requests?.map(r => r.vc_id) || [])];

      const [startupsResult, jurorsResult] = await Promise.all([
        supabase.from('startups').select('id, name, contact_email').in('id', startupIds),
        supabase.from('jurors').select('id, name, email, user_id').in('user_id', vcIds)
      ]);

      const startupsMap = new Map(startupsResult.data?.map(s => [s.id, s]) || []);
      const jurorsMap = new Map(jurorsResult.data?.map(j => [j.user_id, j]) || []);

      const enrichedRequests = requests?.map(request => ({
        ...request,
        startup: startupsMap.get(request.startup_id) || null,
        juror: jurorsMap.get(request.vc_id) || null
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

  const upcomingCalls = pitchRequests.filter(
    request => new Date(request.pitch_date) > new Date() && request.status !== 'cancelled'
  );
  const recentCalls = pitchRequests.filter(
    request => new Date(request.pitch_date) <= new Date() || request.status === 'completed'
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pitchRequests.length}</div>
            <p className="text-xs text-muted-foreground">All scheduled calls</p>
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
              {pitchRequests.length > 0 
                ? Math.round((pitchRequests.filter(r => r.status === 'completed').length / pitchRequests.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

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
                      <div>
                        <div className="font-medium">
                          {format(new Date(request.pitch_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(request.pitch_date), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
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
                      <div>
                        <div className="font-medium">
                          {format(new Date(request.pitch_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(request.pitch_date), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
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
    </div>
  );
};

export default PitchingCallsView;