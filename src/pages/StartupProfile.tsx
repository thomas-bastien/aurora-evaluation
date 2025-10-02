import { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, DollarSign, MapPin, Calendar, FileText, Star, MessageSquare, ExternalLink, AlertCircle, Linkedin, ArrowLeft } from "lucide-react";
import { CURRENCIES } from '@/constants/startupConstants';
import { normalizeStage, getStageColor } from '@/utils/stageUtils';
import { getStatusColor } from '@/utils/statusUtils';
import { StartupEvaluationsList } from '@/components/startups/StartupEvaluationsList';
import { useStartupEvaluationStats } from '@/hooks/useStartupEvaluationStats';
import { StartupCommunicationHistory } from '@/components/communication/StartupCommunicationHistory';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Startup {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  stage: string | null;
  website: string | null;
  location: string | null;
  founded_year: number | null;
  team_size: number | null;
  funding_raised: number | null;
  funding_goal: number | null;
  status: string | null;
  demo_url: string | null;
  pitch_deck_url: string | null;
  founder_names: string[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  key_metrics: any;
  linkedin_url: string | null;
  total_investment_received: number | null;
  investment_currency: string | null;
  business_model: string | null;
  verticals: string[] | null;
  other_vertical_description: string | null;
  regions: string[] | null;
  internal_score: number | null;
  founder_first_name: string | null;
  founder_last_name: string | null;
  founder_linkedin: string | null;
  serviceable_obtainable_market: string | null;
  full_time_team_members: number | null;
  paying_customers_per_year: string | null;
  countries_operating: string | null;
  countries_expansion_plan: string | null;
  business_risks_mitigation: string | null;
}

const StartupProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';
  
  const [startup, setStartup] = useState<Startup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch evaluation statistics
  const { stats: evalStats, loading: statsLoading } = useStartupEvaluationStats(id || '');

  useEffect(() => {
    const fetchStartup = async () => {
      if (!id) {
        setError('No startup ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('startups')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching startup:', error);
          setError('Failed to fetch startup data');
          return;
        }

        if (!data) {
          setError('Startup not found');
          return;
        }

        setStartup(data);
      } catch (error) {
        console.error('Error fetching startup:', error);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStartup();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-6 w-96 mb-4" />
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {error || 'Startup not found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              The startup you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/startups')}>
              Back to Startups
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const formatFunding = (amount: number | null, currency: string | null = 'USD') => {
    if (!amount) return 'N/A';
    const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
    if (amount >= 1000000) {
      return `${currencySymbol}${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(0)}K`;
    }
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  // Use standardized status colors from utils
  const getStatusColorForBadge = getStatusColor;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="mt-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{startup.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {startup.description || 'No description available'}
                </p>
                <div className="flex items-center gap-4 mb-4">
                  {startup.business_model && (
                    <Badge variant="secondary">{startup.business_model}</Badge>
                  )}
                  {startup.verticals && startup.verticals.length > 0 && (
                    <div className="flex gap-2">
                      {startup.verticals.slice(0, 3).map((vertical, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {vertical}
                        </Badge>
                      ))}
                      {startup.verticals.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{startup.verticals.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  {startup.stage && (
                    <Badge variant="outline" className={getStageColor(normalizeStage(startup.stage))}>
                      {normalizeStage(startup.stage)}
                    </Badge>
                  )}
                  <Badge className={getStatusColorForBadge(startup.status || 'pending')}>
                    {startup.status?.replace('-', ' ') || 'pending'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  formatScore(evalStats.overallStats.averageScore)
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {statsLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  `Avg. Score (${evalStats.overallStats.totalReviews} reviews)`
                )}
              </div>
              {!statsLoading && evalStats.overallStats.totalReviews > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {evalStats.screeningStats.reviewCount > 0 && (
                    <span>Screening: {formatScore(evalStats.screeningStats.averageScore)} ({evalStats.screeningStats.reviewCount})</span>
                  )}
                  {evalStats.screeningStats.reviewCount > 0 && evalStats.pitchingStats.reviewCount > 0 && ' • '}
                  {evalStats.pitchingStats.reviewCount > 0 && (
                    <span>Pitching: {formatScore(evalStats.pitchingStats.averageScore)} ({evalStats.pitchingStats.reviewCount})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="market">Market & Traction</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Company Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {startup.description && (
                    <div className="pb-4 border-b">
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">VALUE PROPOSITION</h4>
                      <p className="text-foreground leading-relaxed">
                        {startup.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    {startup.founded_year && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Founded {startup.founded_year}</span>
                      </div>
                    )}
                    {startup.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{startup.location}</span>
                      </div>
                    )}
                    {startup.regions && startup.regions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Regions: {startup.regions.join(', ')}</span>
                      </div>
                    )}
                    {startup.team_size && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{startup.team_size} employees</span>
                      </div>
                    )}
                    {startup.funding_raised && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatFunding(startup.funding_raised)} raised</span>
                      </div>
                    )}
                    {startup.total_investment_received && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatFunding(startup.total_investment_received, startup.investment_currency)} total investment
                        </span>
                      </div>
                    )}
                    {startup.business_model && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{startup.business_model}</span>
                      </div>
                    )}
                  </div>

                  {startup.business_risks_mitigation && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">BUSINESS RISKS & MITIGATION</h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {startup.business_risks_mitigation}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 flex gap-4">
                    {startup.website && (
                      <Button variant="outline" asChild>
                        <a href={startup.website} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visit Website
                        </a>
                      </Button>
                    )}
                    {startup.linkedin_url && (
                      <Button variant="outline" asChild>
                        <a href={startup.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isAdmin && startup.internal_score !== null && startup.internal_score !== undefined && (
                    <div className="pb-4 border-b">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Internal Score</span>
                          <Badge variant="outline" className="text-xs">Admin Only</Badge>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {formatScore(startup.internal_score)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aurora internal evaluation (0-10 scale)
                      </p>
                    </div>
                  )}
                  
                  {startup.key_metrics ? (
                    Object.entries(startup.key_metrics).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium capitalize">{key.replace('_', ' ')}</span>
                          <span className="text-sm font-bold">{String(value)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No metrics available</p>
                  )}
                  
                  {startup.funding_goal && (
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Funding Goal</span>
                        <span className="text-sm font-bold text-primary">
                          {formatFunding(startup.funding_goal)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Market Presence */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Presence</CardTitle>
                  <CardDescription>Geographic reach and market positioning</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {startup.serviceable_obtainable_market && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Serviceable Obtainable Market</span>
                      </div>
                      <p className="text-lg font-bold text-primary ml-6">{startup.serviceable_obtainable_market}</p>
                      <p className="text-xs text-muted-foreground ml-6">Target addressable market size</p>
                    </div>
                  )}
                  
                  {startup.countries_operating && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Currently Operating</span>
                      </div>
                      <p className="text-sm ml-6">{startup.countries_operating}</p>
                    </div>
                  )}
                  
                  {startup.countries_expansion_plan && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Expansion Plans</span>
                      </div>
                      <p className="text-sm ml-6">{startup.countries_expansion_plan}</p>
                    </div>
                  )}

                  {!startup.serviceable_obtainable_market && !startup.countries_operating && !startup.countries_expansion_plan && (
                    <p className="text-sm text-muted-foreground">No market data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Traction & Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Traction & Growth</CardTitle>
                  <CardDescription>Customer base and growth metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {startup.paying_customers_per_year && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Paying Customers/Year</span>
                      </div>
                      <p className="text-lg font-bold text-primary ml-6">{startup.paying_customers_per_year}</p>
                      <p className="text-xs text-muted-foreground ml-6">
                        {startup.paying_customers_per_year.includes('-') 
                          ? 'Annual paying customer range' 
                          : 'Annual paying customers'}
                      </p>
                    </div>
                  )}

                  {startup.full_time_team_members && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Full-Time Team</span>
                      </div>
                      <p className="text-lg font-bold ml-6">{startup.full_time_team_members}</p>
                      <p className="text-xs text-muted-foreground ml-6">
                        Full-time employees
                        {startup.team_size && ` (${startup.team_size} total team size)`}
                      </p>
                    </div>
                  )}

                  {startup.funding_raised && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Funding Progress</span>
                      </div>
                      <p className="text-lg font-bold ml-6">{formatFunding(startup.funding_raised)}</p>
                      <p className="text-xs text-muted-foreground ml-6">
                        {startup.funding_goal 
                          ? `of ${formatFunding(startup.funding_goal)} goal` 
                          : 'Total funding raised'}
                      </p>
                    </div>
                  )}

                  {!startup.paying_customers_per_year && !startup.full_time_team_members && !startup.funding_raised && (
                    <p className="text-sm text-muted-foreground">No traction data available</p>
                  )}
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
                  {startup.pitch_deck_url ? (
                    <Button className="w-full" asChild>
                      <a href={startup.pitch_deck_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Pitch Deck
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      No Pitch Deck Available
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Demo
                  </CardTitle>
                  <CardDescription>Live demo or product showcase</CardDescription>
                </CardHeader>
                <CardContent>
                  {startup.demo_url ? (
                    <Button className="w-full" variant="outline" asChild>
                      <a href={startup.demo_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Demo
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      No Demo Available
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-6">
            <StartupEvaluationsList startupId={startup.id} />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team & Founders</CardTitle>
                <CardDescription>Leadership and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Founder */}
                {(startup.founder_first_name || startup.founder_last_name) && (
                  <div className="pb-4 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold">
                          {startup.founder_first_name} {startup.founder_last_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">Primary Founder</p>
                      </div>
                      {startup.founder_linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={startup.founder_linkedin} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="w-4 h-4 mr-2" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Founders */}
                {startup.founder_names && startup.founder_names.length > 0 && (
                  <div className="pb-4 border-b">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">ADDITIONAL FOUNDERS</h4>
                    <div className="flex flex-wrap gap-2">
                      {startup.founder_names.map((founder, index) => (
                        <Badge key={index} variant="secondary" className="text-sm py-1">
                          <Users className="w-3 h-3 mr-1" />
                          {founder}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">CONTACT INFORMATION</h4>
                  <div className="space-y-2">
                    {startup.contact_email && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${startup.contact_email}`} className="text-sm hover:underline">
                          {startup.contact_email}
                        </a>
                      </div>
                    )}
                    {startup.contact_phone && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${startup.contact_phone}`} className="text-sm hover:underline">
                          {startup.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Size Summary */}
                {(startup.team_size || startup.full_time_team_members) && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">TEAM SIZE</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {startup.team_size && (
                        <div>
                          <p className="text-2xl font-bold text-primary">{startup.team_size}</p>
                          <p className="text-xs text-muted-foreground">Total Team Members</p>
                        </div>
                      )}
                      {startup.full_time_team_members && (
                        <div>
                          <p className="text-2xl font-bold text-primary">{startup.full_time_team_members}</p>
                          <p className="text-xs text-muted-foreground">Full-Time Employees</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!startup.founder_first_name && !startup.founder_last_name && (!startup.founder_names || startup.founder_names.length === 0) && (
                  <p className="text-sm text-muted-foreground">No team information available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <StartupCommunicationHistory startupId={startup.id} startupName={startup.name} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StartupProfile;