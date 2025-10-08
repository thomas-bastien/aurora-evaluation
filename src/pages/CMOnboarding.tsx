import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

const CMOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    linkedinUrl: '',
    organization: '',
    jobTitle: '',
    password: '',
    confirmPassword: ''
  });

  const isOnboarding = searchParams.get('onboarding') === 'true';

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // If not in onboarding mode, redirect to dashboard
    if (!isOnboarding) {
      navigate('/dashboard');
      return;
    }

    // Fetch current profile
    const fetchProfile = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
      }
      
      // Fetch CM data if exists
      const { data: cmData } = await supabase
        .from('community_managers')
        .select('linkedin_url, organization, job_title')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (cmData) {
        setFormData(prev => ({
          ...prev,
          linkedinUrl: cmData.linkedin_url || '',
          organization: cmData.organization || '',
          jobTitle: cmData.job_title || ''
        }));
      }
    };

    fetchProfile();
  }, [user, isOnboarding, navigate]);

  const handlePasswordUpdate = async () => {
    if (!formData.password) return true;
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    const { error } = await supabase.auth.updateUser({
      password: formData.password
    });

    if (error) {
      toast.error('Failed to set password: ' + error.message);
      return false;
    }

    return true;
  };

  const handleProfileUpdate = async () => {
    if (!user) return false;

    // Update CM record with all information
    const { error: cmError } = await supabase
      .from('community_managers')
      .update({
        linkedin_url: formData.linkedinUrl || null,
        organization: formData.organization || null,
        job_title: formData.jobTitle || null
      })
      .eq('user_id', user.id);

    if (cmError) {
      toast.error('Failed to update profile: ' + cmError.message);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update password if provided
      const passwordSuccess = await handlePasswordUpdate();
      if (!passwordSuccess) {
        setLoading(false);
        return;
      }

      // Update profile
      const profileSuccess = await handleProfileUpdate();
      if (!profileSuccess) {
        setLoading(false);
        return;
      }

      toast.success('Profile updated successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Failed to complete onboarding: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  if (!user || !isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Welcome to Aurora!</CardTitle>
          <CardDescription>
            Complete your profile to get started with the evaluation platform
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Set Your Password (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Set a password to access your account later, or skip to use magic links only
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                    disabled={!formData.password}
                  />
                </div>
              </div>
            </div>

            {/* LinkedIn URL */}
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn Profile (Optional)</Label>
              <Input
                type="url"
                id="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/your-profile"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your LinkedIn profile for networking and credibility
              </p>
            </div>

            {/* Organization */}
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                type="text"
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                placeholder="Your organization name"
              />
            </div>

            {/* Job Title */}
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                type="text"
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Your job title"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing Setup...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleSkip}>
                Skip for Now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CMOnboarding;
