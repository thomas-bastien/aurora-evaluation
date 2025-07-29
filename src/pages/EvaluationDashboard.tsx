import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Clock, Users, TrendingUp, FileText, Video } from "lucide-react";

const EvaluationDashboard = () => {
  const [currentStage, setCurrentStage] = useState<"profile-review" | "pitch-evaluation">("profile-review");
  const [scores, setScores] = useState<Record<string, any>>({});

  // Mock data for startups in different stages
  const profileReviewStartups = [
    {
      id: "1",
      name: "TechFlow AI",
      category: "AI/ML",
      description: "AI-powered workflow automation for enterprises",
      stage: "Series A",
      funding: "$2M",
      team: 12,
      evaluated: false,
      priority: "high"
    },
    {
      id: "2", 
      name: "FinSecure",
      category: "Fintech",
      description: "Blockchain-based payment security solutions",
      stage: "Seed",
      funding: "$500K",
      team: 8,
      evaluated: true,
      priority: "medium"
    },
    {
      id: "3",
      name: "HealthSync",
      category: "HealthTech", 
      description: "Digital health platform for remote patient monitoring",
      stage: "Pre-Seed",
      funding: "$100K",
      team: 5,
      evaluated: false,
      priority: "high"
    }
  ];

  const pitchSessionStartups = [
    {
      id: "4",
      name: "DataMind",
      category: "AI/ML",
      sessionTime: "2:00 PM - 2:15 PM",
      pitchDeck: true,
      demo: true,
      evaluated: false,
      sessionId: "session-1"
    },
    {
      id: "5",
      name: "PayFlow",
      category: "Fintech", 
      sessionTime: "2:15 PM - 2:30 PM",
      pitchDeck: true,
      demo: false,
      evaluated: true,
      sessionId: "session-1"
    }
  ];

  const evaluationCriteria = [
    { id: "market", label: "Market Opportunity", weight: 25 },
    { id: "product", label: "Product/Technology", weight: 25 },
    { id: "team", label: "Team Strength", weight: 20 },
    { id: "traction", label: "Traction & Growth", weight: 15 },
    { id: "financials", label: "Financial Model", weight: 15 }
  ];

  const handleScoreChange = (startupId: string, criterion: string, score: number[]) => {
    setScores(prev => ({
      ...prev,
      [startupId]: {
        ...prev[startupId],
        [criterion]: score[0]
      }
    }));
  };

  const calculateOverallScore = (startupId: string) => {
    const startupScores = scores[startupId] || {};
    let totalScore = 0;
    let totalWeight = 0;

    evaluationCriteria.forEach(criterion => {
      const score = startupScores[criterion.id];
      if (score !== undefined) {
        totalScore += score * (criterion.weight / 100);
        totalWeight += criterion.weight / 100;
      }
    });

    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(1) : "0.0";
  };

  const getProgressPercentage = () => {
    if (currentStage === "profile-review") {
      const evaluated = profileReviewStartups.filter(s => s.evaluated).length;
      return (evaluated / profileReviewStartups.length) * 100;
    } else {
      const evaluated = pitchSessionStartups.filter(s => s.evaluated).length;
      return (evaluated / pitchSessionStartups.length) * 100;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Evaluation Dashboard</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Complete your startup evaluations in two stages
          </p>
          
          {/* Progress Overview */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {currentStage === "profile-review" ? "Stage 1: Profile Review" : "Stage 2: Pitch Evaluation"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {currentStage === "profile-review" 
                      ? "Review startup profiles and applications" 
                      : "Evaluate live pitches and presentations"
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{getProgressPercentage().toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentStage} onValueChange={(value) => setCurrentStage(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile-review" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Stage 1: Profile Review
            </TabsTrigger>
            <TabsTrigger value="pitch-evaluation" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Stage 2: Pitch Evaluation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile-review" className="space-y-6">
            <div className="grid gap-6">
              {profileReviewStartups.map((startup) => (
                <Card key={startup.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {startup.name}
                          <Badge variant="secondary">{startup.category}</Badge>
                          {startup.priority === "high" && (
                            <Badge variant="destructive">High Priority</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {startup.description}
                        </CardDescription>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{startup.stage}</span>
                          <span>Funding: {startup.funding}</span>
                          <span>Team: {startup.team} people</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {startup.evaluated ? (
                          <Badge variant="default">Evaluated</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {calculateOverallScore(startup.id)}/10
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {evaluationCriteria.map((criterion) => (
                        <div key={criterion.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">
                              {criterion.label} ({criterion.weight}%)
                            </Label>
                            <span className="text-sm text-muted-foreground">
                              {scores[startup.id]?.[criterion.id] || 0}/10
                            </span>
                          </div>
                          <Slider
                            value={[scores[startup.id]?.[criterion.id] || 0]}
                            onValueChange={(value) => handleScoreChange(startup.id, criterion.id, value)}
                            max={10}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                      ))}
                      
                      <div className="space-y-2">
                        <Label htmlFor={`comments-${startup.id}`}>Comments</Label>
                        <Textarea
                          id={`comments-${startup.id}`}
                          placeholder="Share your thoughts on this startup..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Investment Interest</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interest level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High Interest</SelectItem>
                            <SelectItem value="medium">Medium Interest</SelectItem>
                            <SelectItem value="low">Low Interest</SelectItem>
                            <SelectItem value="pass">Pass</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button size="sm" variant="outline">
                          View Full Application
                        </Button>
                        <Button size="sm">
                          Submit Evaluation
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pitch-evaluation" className="space-y-6">
            <div className="grid gap-6">
              {pitchSessionStartups.map((startup) => (
                <Card key={startup.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {startup.name}
                          <Badge variant="secondary">{startup.category}</Badge>
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {startup.sessionTime}
                          </div>
                          {startup.pitchDeck && (
                            <Badge variant="outline">Pitch Deck Available</Badge>
                          )}
                          {startup.demo && (
                            <Badge variant="outline">Demo Scheduled</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {startup.evaluated ? (
                          <Badge variant="default">Evaluated</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {calculateOverallScore(startup.id)}/10
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Pitch-specific criteria */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Presentation Quality</Label>
                        <Slider
                          value={[scores[startup.id]?.presentation || 0]}
                          onValueChange={(value) => handleScoreChange(startup.id, "presentation", value)}
                          max={10}
                          step={0.5}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Q&A Performance</Label>
                        <Slider
                          value={[scores[startup.id]?.qa || 0]}
                          onValueChange={(value) => handleScoreChange(startup.id, "qa", value)}
                          max={10}
                          step={0.5}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Overall Impression</Label>
                        <Slider
                          value={[scores[startup.id]?.impression || 0]}
                          onValueChange={(value) => handleScoreChange(startup.id, "impression", value)}
                          max={10}
                          step={0.5}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`pitch-notes-${startup.id}`}>Pitch Notes</Label>
                        <Textarea
                          id={`pitch-notes-${startup.id}`}
                          placeholder="Key observations from the pitch..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Follow-up Interest</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select follow-up action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meeting">Request 1-on-1 Meeting</SelectItem>
                            <SelectItem value="duediligence">Start Due Diligence</SelectItem>
                            <SelectItem value="consider">Keep in Consideration</SelectItem>
                            <SelectItem value="pass">Pass</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button size="sm" variant="outline">
                          View Pitch Deck
                        </Button>
                        <Button size="sm" variant="outline">
                          Watch Recording
                        </Button>
                        <Button size="sm">
                          Submit Evaluation
                        </Button>
                      </div>
                    </div>
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

export default EvaluationDashboard;