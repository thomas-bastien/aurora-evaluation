import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, Users, DollarSign, Clock } from "@/lib/icons";

interface Startup {
  id: string;
  name: string;
  category: string;
  stage: string;
  fundingRaised: string;
  teamSize: number;
  evaluationScore: number;
  status: string;
  lastUpdate: string;
}

export const StartupList = () => {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const { data } = await supabase
          .from('startups')
          .select('*')
          .limit(4)
          .order('created_at', { ascending: false });

        if (data) {
          const mappedStartups = data.map(startup => ({
            id: startup.id,
            name: startup.name,
            category: startup.industry || 'Unknown',
            stage: startup.stage || 'Unknown',
            fundingRaised: startup.funding_raised ? `$${(startup.funding_raised / 1000000).toFixed(1)}M` : 'N/A',
            teamSize: startup.team_size || 0,
            evaluationScore: 0, // Will be calculated from evaluations later
            status: startup.status || 'pending',
            lastUpdate: new Date(startup.updated_at).toLocaleDateString()
          }));
          setStartups(mappedStartups);
        }
      } catch (error) {
        console.error('Error fetching startups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStartups();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success text-success-foreground";
      case "selected": return "bg-primary text-primary-foreground";
      case "in-review": return "bg-warning text-warning-foreground";
      case "pending": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 70) return "text-warning";
    if (score > 0) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-foreground">
              Recent Evaluations
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest startup assessments and scores
            </p>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4">Loading startups...</div>
          ) : startups.length === 0 ? (
            <div className="text-center py-4">No startups found</div>
          ) : (
            startups.map((startup) => (
            <div
              key={startup.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-smooth"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold text-lg">
                    {startup.name.charAt(0)}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground">{startup.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{startup.category}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{startup.fundingRaised}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{startup.teamSize} team</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {startup.evaluationScore > 0 && (
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-warning" />
                    <span className={`font-semibold ${getScoreColor(startup.evaluationScore)}`}>
                      {startup.evaluationScore}
                    </span>
                  </div>
                )}
                
                <Badge className={getStatusColor(startup.status)}>
                  {startup.status.replace("-", " ")}
                </Badge>
                
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{startup.lastUpdate}</span>
                </div>
                
                <Button variant="outline" size="sm">
                  {startup.status === "pending" ? "Start Review" : "View Details"}
                </Button>
              </div>
            </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};