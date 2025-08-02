import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, Play, Pause, Settings, Plus } from "lucide-react";

const SessionManagement = () => {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [vcMembers, setVcMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        // Fetch sessions with startup counts
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select(`
            *,
            startup_sessions(
              startups(name)
            )
          `)
          .order('scheduled_date', { ascending: true });

        // Fetch VC members
        const { data: vcData } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'vc');

        setSessions(sessionsData || []);
        setVcMembers(vcData || []);
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "default";
      case "In Progress": return "secondary";
      case "Scheduled": return "secondary";
      case "Cancelled": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Session Management</h1>
            <p className="text-lg text-muted-foreground">
              Create and manage evaluation sessions with grouped startups
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Evaluation Session</DialogTitle>
                <DialogDescription>
                  Set up a new session with grouped startups for evaluation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input id="session-name" placeholder="e.g., Session 5: Consumer Apps" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai-ml">AI/ML</SelectItem>
                      <SelectItem value="fintech">Fintech</SelectItem>
                      <SelectItem value="healthtech">HealthTech</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="consumer">Consumer</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Session description and guidelines..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Scheduled Date</Label>
                    <Input id="date" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="time">Time Slot</Label>
                    <Input id="time" placeholder="e.g., 2:00 PM - 4:00 PM" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Session</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Session Overview</TabsTrigger>
            <TabsTrigger value="details">Session Details</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6">
              {sessions.map((session) => (
                <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">{session.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {session.scheduled_date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.time_slot}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {session.vc_participants} VCs
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.startup_sessions?.length || 0} startups assigned
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                      {session.status === "completed" && session.avg_score && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{session.avg_score}/10</div>
                          <div className="text-xs text-muted-foreground">Avg Score</div>
                        </div>
                      )}
                        <Badge variant={getStatusColor(session.status)}>{session.status}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completion Rate</span>
                          <span>{session.completion_rate || 0}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${session.completion_rate || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedSession(session.id)}
                      >
                        View Details
                      </Button>
                      {session.status === "scheduled" && (
                        <Button size="sm" className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          Start Session
                        </Button>
                      )}
                      {session.status === "in-progress" && (
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Pause className="w-3 h-3" />
                          Pause Session
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Settings className="w-3 h-3" />
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            {selectedSession ? (
              <Card>
                <CardHeader>
                  <CardTitle>Session Details</CardTitle>
                  <CardDescription>Detailed view of the selected session</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Select a session from the overview to view detailed information.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Session Details</CardTitle>
                  <CardDescription>Select a session to view details</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Click "View Details" on any session from the overview tab to see detailed information.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>VC Participants</CardTitle>
                <CardDescription>Manage VC participants across all sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vcMembers.map((vc) => (
                    <div key={vc.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{vc.full_name || 'Unknown VC'}</h4>
                          <p className="text-sm text-muted-foreground">{vc.organization || 'No organization'}</p>
                        </div>
                        <div className="flex gap-2">
                          {vc.expertise?.map((specialty: string) => (
                            <Badge key={specialty} variant="secondary">{specialty}</Badge>
                          )) || <Badge variant="outline">No expertise listed</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">View Profile</Button>
                        <Button size="sm" variant="outline">Session History</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SessionManagement;