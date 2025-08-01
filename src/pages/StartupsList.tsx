import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Users, DollarSign, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Startup {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  stage: string | null;
  location: string | null;
  founded_year: number | null;
  team_size: number | null;
  funding_goal: number | null;
  status: string | null;
  founder_names: string[] | null;
}

export default function StartupsList() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const { data, error } = await supabase
          .from('startups')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching startups:', error);
        } else {
          setStartups(data || []);
        }
      } catch (error) {
        console.error('Error fetching startups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStartups();
  }, []);

  const formatFunding = (amount: number | null) => {
    if (!amount) return 'N/A';
    return `$${(amount / 1000000).toFixed(1)}M`;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'under-review': return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case 'seed': return 'bg-blue-100 text-blue-800';
      case 'series-a': return 'bg-purple-100 text-purple-800';
      case 'series-b': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Startups Ecosystem</h1>
            <p className="text-muted-foreground mt-2">Explore innovative startups in our portfolio</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-80">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Startups Ecosystem</h1>
          <p className="text-muted-foreground mt-2">Explore innovative startups in our portfolio</p>
        </div>

        {startups.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No startups found</h3>
            <p className="text-muted-foreground">There are currently no startups in the ecosystem.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {startups.map((startup) => (
              <Link key={startup.id} to={`/startup/${startup.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold">{startup.name}</CardTitle>
                      <Badge className={getStatusColor(startup.status)}>
                        {startup.status?.replace('-', ' ') || 'pending'}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {startup.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {startup.industry && (
                        <Badge variant="outline" className={getStageColor(startup.stage)}>
                          {startup.stage || 'Unknown'}
                        </Badge>
                      )}
                      {startup.industry && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {startup.industry}
                        </span>
                      )}
                    </div>
                    
                    {startup.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {startup.location}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {startup.team_size && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{startup.team_size} people</span>
                        </div>
                      )}
                      {startup.founded_year && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{startup.founded_year}</span>
                        </div>
                      )}
                    </div>
                    
                    {startup.funding_goal && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>Seeking {formatFunding(startup.funding_goal)}</span>
                      </div>
                    )}
                    
                    {startup.founder_names && startup.founder_names.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Founders: </span>
                        <span className="font-medium">
                          {startup.founder_names.join(', ')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}