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
import { REGION_OPTIONS, VERTICAL_OPTIONS, STAGE_OPTIONS } from '@/constants/jurorPreferences';

const JurorOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    calendlyLink: '',
    linkedinUrl: '',
    targetVerticals: [] as string[],
    preferredStages: [] as string[],
    preferredRegions: [] as string[],
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
      
      // Fetch juror data if exists
      const { data: jurorData } = await supabase
        .from('jurors')
        .select('target_verticals, preferred_stages, preferred_regions, linkedin_url, calendly_link')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (jurorData) {
        setFormData(prev => ({
          ...prev,
          targetVerticals: jurorData.target_verticals || [],
          preferredStages: jurorData.preferred_stages || [],
          preferredRegions: jurorData.preferred_regions || [],
          linkedinUrl: jurorData.linkedin_url || '',
          calendlyLink: jurorData.calendly_link || ''
        }));
      }
    };

    fetchProfile();
  }, [user, isOnboarding, navigate]);


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
    if (!user) return false;

    // Update juror record with all preferences and calendly_link
    const { error: jurorError } = await supabase
      .from('jurors')
      .update({
        target_verticals: formData.targetVerticals.length > 0 ? formData.targetVerticals : null,
        preferred_stages: formData.preferredStages.length > 0 ? formData.preferredStages : null,
        preferred_regions: formData.preferredRegions.length > 0 ? formData.preferredRegions : null,
        linkedin_url: formData.linkedinUrl || null,
        calendly_link: formData.calendlyLink || null
      })
      .eq('user_id', user.id);

    if (jurorError) {
      toast.error('Failed to update profile: ' + jurorError.message);
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
              <p className="text-sm text-muted-foreground mt-1">
                This will be used to schedule pitch meetings with startups
              </p>
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

            {/* Preferred Regions */}
            <div>
              <Label>Preferred Regions (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select regions you prefer to evaluate startups from
              </p>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map((option) => (
                  <Badge
                    key={option}
                    variant={formData.preferredRegions.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      preferredRegions: toggleArrayItem(prev.preferredRegions, option)
                    }))}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Target Investment Verticals */}
            <div>
              <Label>Target Investment Verticals (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select industries you specialize in
              </p>
              <div className="flex flex-wrap gap-2">
                {VERTICAL_OPTIONS.map((option) => (
                  <Badge
                    key={option}
                    variant={formData.targetVerticals.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      targetVerticals: toggleArrayItem(prev.targetVerticals, option)
                    }))}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preferred Startup Stages */}
            <div>
              <Label>Preferred Startup Stages (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select funding stages you prefer to evaluate
              </p>
              <div className="flex flex-wrap gap-2">
                {STAGE_OPTIONS.map((option) => (
                  <Badge
                    key={option}
                    variant={formData.preferredStages.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      preferredStages: toggleArrayItem(prev.preferredStages, option)
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