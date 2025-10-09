import { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Mail, User, MapPin, Target, AlertCircle, Linkedin, ExternalLink, ArrowLeft, Eye } from "lucide-react";
import { JurorEvaluationsList } from '@/components/jurors/JurorEvaluationsList';
import { JurorStatusBadge } from '@/components/common/JuryRoundStatusBadges';
import { RoundProgressTab } from '@/components/jurors/RoundProgressTab';
import { calculateProgressiveJurorStatus, type ProgressiveJurorStatus } from '@/utils/juryStatusUtils';
import { EmailHistorySection } from '@/components/communication/EmailHistorySection';
import { CommunicationWorkflowView } from '@/components/communication/CommunicationWorkflowView';

interface Juror {
  id: string;
  name: string;
  email: string;
  job_title: string | null;
  company: string | null;
  user_id: string | null;
  invitation_token: string | null;
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  preferred_regions: string[] | null;
  target_verticals: string[] | null;
  preferred_stages: string[] | null;
  linkedin_url: string | null;
  created_at: string;
}

const JurorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { startImpersonation } = useImpersonation();
  const [juror, setJuror] = useState<Juror | null>(null);
  const [progressiveStatus, setProgressiveStatus] = useState<ProgressiveJurorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const handleViewAsJuror = () => {
    if (juror && isAdmin) {
      startImpersonation(juror.id, juror.name);
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    const fetchJuror = async () => {
      if (!id) {
        setError('No juror ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('jurors')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching juror:', error);
          setError('Failed to fetch juror data');
          return;
        }

        if (!data) {
          setError('Juror not found');
          return;
        }

        setJuror(data);
        
        // Calculate progressive status
        const status = await calculateProgressiveJurorStatus(data.id);
        setProgressiveStatus(status);
      } catch (error) {
        console.error('Error fetching juror:', error);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchJuror();
  }, [id]);

  const getJurorStatus = (juror: Juror) => {
    if (juror.user_id) {
      return { text: 'Active', variant: 'default' as const, description: 'Juror has accepted invitation and is active' };
    } else if (juror.invitation_sent_at) {
      const now = new Date();
      const expiresAt = juror.invitation_expires_at ? new Date(juror.invitation_expires_at) : null;
      
      if (expiresAt && now > expiresAt) {
        return { text: 'Invitation Expired', variant: 'destructive' as const, description: 'Invitation has expired and needs to be resent' };
      } else {
        return { text: 'Invitation Sent', variant: 'secondary' as const, description: 'Invitation sent, awaiting response' };
      }
    } else {
      return { text: 'Not Invited', variant: 'outline' as const, description: 'Juror has not been sent an invitation yet' };
    }
  };

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

  if (error || !juror) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {error || 'Juror not found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              The juror you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/jurors')}>
              Back to Jurors
            </Button>
          </div>
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
                <h1 className="text-3xl font-bold text-foreground mb-2">{juror.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {juror.job_title ? `${juror.job_title}${juror.company ? ` at ${juror.company}` : ''}` : 'Juror Profile'}
                </p>
                <JurorStatusBadge 
                  jurorId={id!}
                  progressiveStatus={progressiveStatus}
                  className="mb-4"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Button
                  onClick={handleViewAsJuror}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View as Juror
                </Button>
              )}
              {juror.company && (
                <Badge variant="secondary">{juror.company}</Badge>
              )}
              {juror.preferred_regions && juror.preferred_regions.length > 0 && (
                <div className="flex gap-2">
                  {juror.preferred_regions.slice(0, 2).map((region, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {region}
                    </Badge>
                  ))}
                  {juror.preferred_regions.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{juror.preferred_regions.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Jury member profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{juror.email}</span>
                  </div>
                  
                  {juror.job_title && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{juror.job_title}</span>
                    </div>
                  )}
                  
                  {juror.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{juror.company}</span>
                    </div>
                  )}

                  {juror.linkedin_url && (
                    <div className="pt-4">
                      <Button variant="outline" asChild>
                        <a href={juror.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4 mr-2" />
                          LinkedIn Profile
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preferences Section */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4">
                  {/* Preferred Regions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="w-4 h-4" />
                        Preferred Regions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {juror.preferred_regions && juror.preferred_regions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {juror.preferred_regions.map((region, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {region}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No preferred regions specified</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Target Verticals */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="w-4 h-4" />
                        Target Verticals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {juror.target_verticals && juror.target_verticals.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {juror.target_verticals.map((vertical, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {vertical}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No target verticals specified</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Preferred Stages */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="w-4 h-4" />
                        Preferred Stages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {juror.preferred_stages && juror.preferred_stages.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {juror.preferred_stages.map((stage, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {stage}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No preferred stages specified</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-6">
            {/* Round Progress Section */}
            <div className="mb-8">
              <RoundProgressTab jurorId={juror.id} progressiveStatus={progressiveStatus} />
            </div>

            {/* Evaluations Section */}
            {juror.user_id ? (
              <JurorEvaluationsList jurorUserId={juror.user_id} />
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">No evaluations available</h3>
                <p className="text-muted-foreground">This juror hasn't accepted their invitation yet, so no evaluations are available.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            {/* Communication Workflow */}
            <CommunicationWorkflowView 
              participantId={juror.id} 
              participantType="juror" 
            />
            
            {/* Email History */}
            <EmailHistorySection 
              participantId={juror.id}
              participantType="juror"
              participantName={juror.name}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default JurorProfile;