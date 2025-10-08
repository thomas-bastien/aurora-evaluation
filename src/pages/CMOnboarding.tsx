import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const CMOnboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cmProfile, setCmProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    jobTitle: '',
    organization: '',
    linkedinUrl: '',
  });

  useEffect(() => {
    const fetchCMData = async () => {
      if (!user) return;

      try {
        const { data: cmData, error } = await supabase
          .from('community_managers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        setCmProfile(cmData);
        setFormData(prev => ({
          ...prev,
          jobTitle: cmData.job_title || '',
          organization: cmData.organization || '',
          linkedinUrl: cmData.linkedin_url || '',
        }));
      } catch (error) {
        console.error('Error fetching CM data:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && isOnboarding) {
      fetchCMData();
    } else if (user && !isOnboarding) {
      navigate('/dashboard');
    }
  }, [user, isOnboarding, navigate, toast]);

  const handlePasswordUpdate = async () => {
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password) {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    }

    return true;
  };

  const handleProfileUpdate = async () => {
    if (!cmProfile?.id) return false;

    const { error } = await supabase
      .from('community_managers')
      .update({
        job_title: formData.jobTitle || null,
        organization: formData.organization || null,
        linkedin_url: formData.linkedinUrl || null,
      })
      .eq('id', cmProfile.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const passwordSuccess = await handlePasswordUpdate();
      if (!passwordSuccess) {
        setSubmitting(false);
        return;
      }

      const profileSuccess = await handleProfileUpdate();
      if (!profileSuccess) {
        setSubmitting(false);
        return;
      }

      toast({
        title: "Profile completed",
        description: "Welcome to your dashboard!",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error during onboarding:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading || !user || !isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Set up your Community Manager account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Set Your Password</h3>
              <div className="space-y-2">
                <Label htmlFor="password">Password (Recommended)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a secure password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profile Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Community Manager"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="e.g., Aurora Tech Awards"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing Setup...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CMOnboarding;
