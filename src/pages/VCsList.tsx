import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Building, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface VCProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  organization: string | null;
  role: 'vc' | 'admin';
  created_at: string;
}

export default function VCsList() {
  const [vcs, setVCs] = useState<VCProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVCs = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'vc')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching VCs:', error);
        } else {
          setVCs(data || []);
        }
      } catch (error) {
        console.error('Error fetching VCs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVCs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Venture Capitalists</h1>
            <p className="text-muted-foreground mt-2">Connect with experienced investors in our network</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
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
          <h1 className="text-3xl font-bold text-foreground">Venture Capitalists</h1>
          <p className="text-muted-foreground mt-2">Connect with experienced investors in our network</p>
        </div>

        {vcs.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No VCs found</h3>
            <p className="text-muted-foreground">There are currently no venture capitalists in our network.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vcs.map((vc) => (
              <Link key={vc.id} to={`/vc/${vc.user_id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold">
                        {vc.full_name || 'Unknown Name'}
                      </CardTitle>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <UserCheck className="h-3 w-3 mr-1" />
                        VC
                      </Badge>
                    </div>
                    {vc.organization && (
                      <CardDescription className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {vc.organization}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>Experienced venture capitalist focused on early-stage startups and innovative technologies.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Technology</Badge>
                      <Badge variant="outline">Healthcare</Badge>
                      <Badge variant="outline">Fintech</Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Member since {new Date(vc.created_at).toLocaleDateString()}
                    </div>
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