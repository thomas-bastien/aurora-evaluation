import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { User, Building, Star, Calendar, MessageSquare, TrendingUp, Clock } from "lucide-react";

const VCProfile = () => {
  const { id } = useParams();
  const [vc, setVc] = useState<any>(null);
  const [evaluationHistory, setEvaluationHistory] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [meetingRequests, setMeetingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVCData = async () => {
      if (!id) return;

      try {
        // Fetch VC profile
        const { data: vcData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', id)
          .single();

        // Fetch evaluation history
        const { data: evaluationsData } = await supabase
          .from('evaluations')
          .select(`
            *,
            startups(name, industry)
          `)
          .eq('evaluator_id', id)
          .order('created_at', { ascending: false });

        // Fetch upcoming sessions
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select(`
            *,
            vc_sessions!inner(*)
          `)
          .eq('vc_sessions.vc_id', id)
          .eq('status', 'scheduled')
          .order('scheduled_date', { ascending: true });

        // Fetch meeting requests
        const { data: meetingsData } = await supabase
          .from('pitch_requests')
          .select(`
            *,
            startups(name)
          `)
          .eq('vc_id', id)
          .order('created_at', { ascending: false });

        setVc(vcData);
        setEvaluationHistory(evaluationsData || []);
        setUpcomingSessions(sessionsData || []);
        setMeetingRequests(meetingsData || []);
      } catch (error) {
        console.error('Error fetching VC data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVCData();
  }, [id]);

  if (loading || !vc) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{vc.full_name || 'Unknown VC'}</h1>
              <p className="text-lg text-muted-foreground mb-4">{vc.role || 'VC Partner'} at {vc.organization || 'Investment Firm'}</p>
              <div className="flex items-center gap-4 mb-4">
                {vc.expertise?.map((area: string) => (
                  <Badge key={area} variant="secondary">{area}</Badge>
                )) || <Badge variant="outline">No expertise listed</Badge>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">N/A</div>
              <div className="text-sm text-muted-foreground">Avg. Score Given</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Evaluations</p>
                  <p className="text-2xl font-bold text-foreground">{evaluationHistory.length}</p>
                </div>
                <Star className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Sessions</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
                <Calendar className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Sessions</p>
                  <p className="text-2xl font-bold text-foreground">{upcomingSessions.length}</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Meeting Requests</p>
                  <p className="text-2xl font-bold text-foreground">{meetingRequests.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="evaluations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="evaluations">Evaluation History</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="meetings">Meeting Requests</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluations" className="space-y-6">
            <div className="space-y-4">
              {evaluationHistory.map((evaluation, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{evaluation.startups?.name || 'Unknown Startup'}</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.startups?.industry || 'Unknown Industry'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(evaluation.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={evaluation.status === "completed" ? "default" : "secondary"}>
                          {evaluation.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-primary" />
                          <span className="font-bold text-primary">{evaluation.overall_score || 'N/A'}/10</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{evaluation.overall_notes || 'No notes provided'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Upcoming Sessions</h3>
              {upcomingSessions.map((session, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{session.name}</h4>
                        <p className="text-sm text-muted-foreground">{session.category}</p>
                        <p className="text-sm text-muted-foreground">{session.scheduled_date} • {session.time_slot}</p>
                      </div>
                      <Badge variant="default">{session.status}</Badge>
                    </div>
                    <Button className="w-full">Join Session</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            <div className="space-y-4">
              {meetingRequests.map((request, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{request.startups?.name || 'Unknown Startup'}</h4>
                        <p className="text-sm text-muted-foreground">Requested: {new Date(request.created_at).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Pitch Date: {request.pitch_date ? new Date(request.pitch_date).toLocaleDateString() : 'TBD'}
                        </p>
                      </div>
                      <Badge 
                        variant={request.status === "Scheduled" ? "default" : "secondary"}
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {request.status === "Pending" && (
                        <>
                          <Button size="sm">Accept</Button>
                          <Button size="sm" variant="outline">Decline</Button>
                        </>
                      )}
                      {request.status === "Scheduled" && (
                        <Button size="sm" variant="outline">Reschedule</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Investment Focus</CardTitle>
                  <CardDescription>Your areas of expertise and investment stages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Expertise Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {vc.expertise?.map((area: string) => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      )) || <Badge variant="outline">No expertise listed</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Investment Stages</p>
                    <div className="flex flex-wrap gap-2">
                      {vc.investment_stages?.map((stage: string) => (
                        <Badge key={stage} variant="outline">{stage}</Badge>
                      )) || <Badge variant="outline">No stages listed</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calendly Integration</CardTitle>
                  <CardDescription>Manage your meeting availability</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Current Calendly link: {vc.calendly_link || 'Not set'}
                  </p>
                  <Button variant="outline" className="w-full">
                    Update Calendly Link
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VCProfile;