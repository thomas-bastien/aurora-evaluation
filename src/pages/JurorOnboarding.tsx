import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle, X } from 'lucide-react';
import { VERTICAL_OPTIONS, STAGE_OPTIONS } from '@/constants/jurorPreferences';

const JurorOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    calendlyLink: '',
    expertise: [] as string[],
    investmentStages: [] as string[],
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setFormData(prev => ({
          ...prev,
          calendlyLink: data.calendly_link || '',
          expertise: data.expertise || [],
          investmentStages: data.investment_stages || []
        }));
      }
    };

    fetchProfile();
  }, [user, isOnboarding, navigate]);

  const expertiseOptions = VERTICAL_OPTIONS;
  const stageOptions = STAGE_OPTIONS;

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

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
    // Update profile with calendly link
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        calendly_link: formData.calendlyLink || null
      })
      .eq('user_id', user!.id);

    if (profileError) {
      toast.error('Failed to update profile: ' + profileError.message);
      return false;
    }

    // Update or create juror record with expertise and stages
    if (formData.expertise.length > 0 || formData.investmentStages.length > 0) {
      const { error: jurorError } = await supabase
        .from('jurors')
        .update({
          target_verticals: formData.expertise.length > 0 ? formData.expertise : null,
          preferred_stages: formData.investmentStages.length > 0 ? formData.investmentStages : null
        })
        .eq('user_id', user!.id);

      if (jurorError) {
        toast.error('Failed to update juror preferences: ' + jurorError.message);
        return false;
      }
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

            {/* Calendly Link */}
            <div>
              <Label htmlFor="calendlyLink">Calendly Link (Optional)</Label>
              <Input
                type="url"
                id="calendlyLink"
                value={formData.calendlyLink}
                onChange={(e) => setFormData(prev => ({ ...prev, calendlyLink: e.target.value }))}
                placeholder="https://calendly.com/your-profile"
              />
            </div>

            {/* Expertise */}
            <div>
              <Label>Areas of Expertise (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select the industries you have experience evaluating
              </p>
              <div className="flex flex-wrap gap-2">
                {expertiseOptions.map((option) => (
                  <Badge
                    key={option}
                    variant={formData.expertise.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      expertise: toggleArrayItem(prev.expertise, option)
                    }))}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Investment Stages */}
            <div>
              <Label>Investment Stages (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select the funding stages you're most interested in
              </p>
              <div className="flex flex-wrap gap-2">
                {stageOptions.map((option) => (
                  <Badge
                    key={option}
                    variant={formData.investmentStages.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      investmentStages: toggleArrayItem(prev.investmentStages, option)
                    }))}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
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

export default JurorOnboarding;