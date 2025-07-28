import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { User, Building, Star, Calendar, MessageSquare, TrendingUp, Clock } from "lucide-react";

const VCProfile = () => {
  const { id } = useParams();

  // Mock VC data - would come from API/database
  const vc = {
    id: id,
    name: "Alex Thompson",
    firm: "Sequoia Capital",
    role: "Partner",
    email: "alex.thompson@sequoia.com",
    expertise: ["AI/ML", "SaaS", "Fintech"],
    investmentStage: ["Seed", "Series A"],
    totalEvaluations: 18,
    avgScore: 7.8,
    completedSessions: 3,
    pendingSessions: 1,
    calendlyLink: "https://calendly.com/alex-thompson"
  };

  const evaluationHistory = [
    {
      startupName: "TechFlow AI",
      category: "AI/ML",
      score: 9,
      date: "2024-01-15",
      status: "Completed",
      comments: "Exceptional team with strong technical background."
    },
    {
      startupName: "DataSync Pro",
      category: "SaaS",
      score: 7,
      date: "2024-01-14",
      status: "Completed",
      comments: "Good product but needs stronger go-to-market strategy."
    },
    {
      startupName: "FinSecure",
      category: "Fintech",
      score: 8,
      date: "2024-01-13",
      status: "Completed",
      comments: "Strong regulatory compliance and security focus."
    },
    {
      startupName: "CloudOps Automation",
      category: "DevOps",
      score: 6,
      date: "2024-01-12",
      status: "Completed",
      comments: "Competitive market but good technical execution."
    }
  ];

  const upcomingSessions = [
    {
      sessionName: "Session 4: Enterprise Software",
      startupsCount: 6,
      scheduledDate: "2024-01-20",
      timeSlot: "2:00 PM - 4:00 PM",
      status: "Scheduled"
    }
  ];

  const meetingRequests = [
    {
      startupName: "TechFlow AI",
      requestDate: "2024-01-16",
      status: "Pending",
      pitchDate: "TBD"
    },
    {
      startupName: "FinSecure",
      requestDate: "2024-01-15",
      status: "Scheduled",
      pitchDate: "2024-01-25"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{vc.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{vc.role} at {vc.firm}</p>
              <div className="flex items-center gap-4 mb-4">
                {vc.expertise.map((area) => (
                  <Badge key={area} variant="secondary">{area}</Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">{vc.avgScore}/10</div>
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
                  <p className="text-2xl font-bold text-foreground">{vc.totalEvaluations}</p>
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
                  <p className="text-2xl font-bold text-foreground">{vc.completedSessions}</p>
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
                  <p className="text-2xl font-bold text-foreground">{vc.pendingSessions}</p>
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
                        <h4 className="font-semibold text-foreground">{evaluation.startupName}</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.category}</p>
                        <p className="text-xs text-muted-foreground">{evaluation.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={evaluation.status === "Completed" ? "default" : "secondary"}>
                          {evaluation.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-primary" />
                          <span className="font-bold text-primary">{evaluation.score}/10</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{evaluation.comments}</p>
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
                        <h4 className="font-semibold text-foreground">{session.sessionName}</h4>
                        <p className="text-sm text-muted-foreground">{session.startupsCount} startups to evaluate</p>
                        <p className="text-sm text-muted-foreground">{session.scheduledDate} • {session.timeSlot}</p>
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
                        <h4 className="font-semibold text-foreground">{request.startupName}</h4>
                        <p className="text-sm text-muted-foreground">Requested: {request.requestDate}</p>
                        <p className="text-sm text-muted-foreground">
                          Pitch Date: {request.pitchDate}
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
                      {vc.expertise.map((area) => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Investment Stages</p>
                    <div className="flex flex-wrap gap-2">
                      {vc.investmentStage.map((stage) => (
                        <Badge key={stage} variant="outline">{stage}</Badge>
                      ))}
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
                    Current Calendly link: {vc.calendlyLink}
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