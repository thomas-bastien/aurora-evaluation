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

const AdminOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: '',
    organization: '',
    jobTitle: '',
    linkedinUrl: '',
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

    // Fetch current profile and admin data
    const fetchData = async () => {
      setDataLoading(true);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (profileData || adminData) {
        setFormData(prev => ({
          ...prev,
          fullName: profileData?.full_name || adminData?.name || '',
          organization: profileData?.organization || adminData?.organization || '',
          jobTitle: adminData?.job_title || '',
          linkedinUrl: adminData?.linkedin_url || ''
        }));
      }
      
      setDataLoading(false);
    };

    fetchData();
  }, [user, isOnboarding, navigate]);

  const handlePasswordUpdate = async () => {
    if (!formData.password) {
      toast.error('Password is required');
      return false;
    }
    
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

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: formData.fullName,
        organization: formData.organization
      })
      .eq('user_id', user.id);

    if (profileError) {
      toast.error('Failed to update profile: ' + profileError.message);
      return false;
    }

    // Update admin record
    const { error: adminError } = await supabase
      .from('admins')
      .update({
        name: formData.fullName,
        organization: formData.organization || null,
        job_title: formData.jobTitle || null,
        linkedin_url: formData.linkedinUrl || null
      })
      .eq('user_id', user.id);

    if (adminError) {
      toast.error('Failed to update admin info: ' + adminError.message);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.fullName.trim()) {
        toast.error('Please enter your full name');
        setLoading(false);
        return;
      }

      if (!formData.password.trim()) {
        toast.error('Password is required');
        setLoading(false);
        return;
      }

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

  if (!user || !isOnboarding || dataLoading) {
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
          <CardTitle className="text-2xl">Welcome, Administrator!</CardTitle>
          <CardDescription>
            Complete your profile to access the admin dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Set Your Password</h3>
              <p className="text-sm text-muted-foreground">
                Set a password for future logins. You'll need this to access the admin dashboard after this session.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password (min. 6 characters)"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profile Information</h3>
              
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="organization">Organization (Optional)</Label>
                <Input
                  type="text"
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                  placeholder="Aurora Tech Awards"
                />
              </div>

              <div>
                <Label htmlFor="jobTitle">Job Title (Optional)</Label>
                <Input
                  type="text"
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="Platform Administrator"
                />
              </div>

              <div>
                <Label htmlFor="linkedinUrl">LinkedIn Profile (Optional)</Label>
                <Input
                  type="url"
                  id="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/your-profile"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
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

export default AdminOnboarding;
