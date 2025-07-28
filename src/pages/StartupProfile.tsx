import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Building2, Users, DollarSign, MapPin, Calendar, FileText, Star, MessageSquare } from "lucide-react";

const StartupProfile = () => {
  const { id } = useParams();

  // Mock startup data - would come from API/database
  const startup = {
    id: id,
    name: "TechFlow AI",
    tagline: "Automating workflow optimization with advanced AI",
    category: "AI/ML",
    stage: "Series A",
    foundedYear: 2022,
    location: "London, UK",
    website: "https://techflow.ai",
    fundingRaised: "$2.5M",
    teamSize: 12,
    evaluationScore: 8.2,
    evaluationCount: 5,
    status: "Under Review",
    description: "TechFlow AI develops cutting-edge artificial intelligence solutions that automatically optimize business workflows, reducing operational costs by up to 40% while improving efficiency.",
    founders: [
      { name: "Sarah Chen", role: "CEO", background: "Former Google AI researcher" },
      { name: "Marcus Kumar", role: "CTO", background: "Ex-DeepMind engineer" }
    ],
    metrics: {
      revenue: "$180K ARR",
      growth: "25% MoM",
      customers: 15,
      retention: "95%"
    },
    pitchDeck: "pitch_deck_techflow.pdf",
    application: "application_techflow.pdf"
  };

  const evaluations = [
    {
      vcName: "Alex Thompson",
      vcFirm: "Sequoia Capital",
      score: 9,
      date: "2024-01-15",
      comments: "Exceptional team with strong technical background. Product-market fit is evident with impressive early traction."
    },
    {
      vcName: "Maria Rodriguez",
      vcFirm: "Andreessen Horowitz",
      score: 8,
      date: "2024-01-14",
      comments: "Solid technology and good market opportunity. Would like to see more enterprise customer validation."
    },
    {
      vcName: "David Kim",
      vcFirm: "Bessemer Venture Partners",
      score: 7,
      date: "2024-01-13",
      comments: "Strong technical solution but competitive landscape is challenging. Team execution will be key."
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
              <h1 className="text-3xl font-bold text-foreground mb-2">{startup.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{startup.tagline}</p>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="secondary">{startup.category}</Badge>
                <Badge variant="outline">{startup.stage}</Badge>
                <Badge 
                  variant={startup.status === "Under Review" ? "default" : "secondary"}
                >
                  {startup.status}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">{startup.evaluationScore}/10</div>
              <div className="text-sm text-muted-foreground">Avg. Score ({startup.evaluationCount} reviews)</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Company Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-foreground leading-relaxed">{startup.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Founded {startup.foundedYear}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{startup.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{startup.teamSize} employees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{startup.fundingRaised} raised</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Revenue</span>
                      <span className="text-sm font-bold">{startup.metrics.revenue}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Growth Rate</span>
                      <span className="text-sm font-bold text-success">{startup.metrics.growth}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Customers</span>
                      <span className="text-sm font-bold">{startup.metrics.customers}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Retention</span>
                      <span className="text-sm font-bold">{startup.metrics.retention}</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Pitch Deck
                  </CardTitle>
                  <CardDescription>Company presentation and business overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    View Pitch Deck
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Application
                  </CardTitle>
                  <CardDescription>Detailed application and business plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    View Application
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-6">
            <div className="space-y-4">
              {evaluations.map((evaluation, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{evaluation.vcName}</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.vcFirm}</p>
                        <p className="text-xs text-muted-foreground">{evaluation.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-primary" />
                        <span className="font-bold text-primary">{evaluation.score}/10</span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{evaluation.comments}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {startup.founders.map((founder, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {founder.name}
                    </CardTitle>
                    <CardDescription>{founder.role}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{founder.background}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StartupProfile;