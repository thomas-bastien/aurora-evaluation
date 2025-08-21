import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Building2, 
  Mail, 
  Calendar,
  Save,
  Star,
  Target,
  FileText,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ProfileForm {
  full_name: string;
  organization: string;
  calendly_link: string;
  expertise: string[];
  investment_stages: string[];
}

interface EvaluationStats {
  total_assigned: number;
  completed: number;
  draft: number;
  average_score: number;
}

const VCProfile = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<EvaluationStats>({
    total_assigned: 0,
    completed: 0,
    draft: 0,
    average_score: 0
  });
  
  const [formData, setFormData] = useState<ProfileForm>({
    full_name: '',
    organization: '',
    calendly_link: '',
    expertise: [],
    investment_stages: []
  });

  const expertiseOptions = [
    'AI/ML', 'Fintech', 'Healthcare', 'SaaS', 'E-commerce', 'Blockchain', 
    'IoT', 'Cybersecurity', 'EdTech', 'Climate Tech', 'Mobility', 'Gaming'
  ];

  const investmentStageOptions = [
    'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'
  ];

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        organization: profile.organization || '',
        calendly_link: profile.calendly_link || '',
        expertise: profile.expertise || [],
        investment_stages: profile.investment_stages || []
      });
    }
    fetchEvaluationStats();
  }, [profile]);

  const fetchEvaluationStats = async () => {
    if (!user) return;

    try {
      // Fetch assignments count
      const { count: totalAssigned } = await supabase
        .from('startup_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('juror_id', user.id)
        .eq('status', 'assigned');

      // Fetch evaluations
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('*')
        .eq('evaluator_id', user.id);

      const completed = evaluations?.filter(e => e.status === 'submitted').length || 0;
      const draft = evaluations?.filter(e => e.status === 'draft').length || 0;
      
      const averageScore = evaluations && evaluations.length > 0
        ? evaluations
            .filter(e => e.overall_score)
            .reduce((sum, e) => sum + (e.overall_score || 0), 0) / 
          evaluations.filter(e => e.overall_score).length
        : 0;

      setStats({
        total_assigned: totalAssigned || 0,
        completed,
        draft,
        average_score: averageScore || 0
      });
    } catch (error) {
      console.error('Error fetching evaluation stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          organization: formData.organization,
          calendly_link: formData.calendly_link,
          expertise: formData.expertise,
          investment_stages: formData.investment_stages,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string, setter: (items: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const completionRate = stats.total_assigned > 0 ? (stats.completed / stats.total_assigned) * 100 : 0;

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Loading Profile</h2>
              <p className="text-muted-foreground">Please wait while we load your profile information.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">VC Profile</h1>
          <p className="text-lg text-muted-foreground">
            Manage your profile information and track your evaluation progress
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        value={formData.organization}
                        onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                        placeholder="Your VC firm or organization"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="calendly_link">Calendly Link</Label>
                    <Input
                      id="calendly_link"
                      type="url"
                      value={formData.calendly_link}
                      onChange={(e) => setFormData(prev => ({ ...prev, calendly_link: e.target.value }))}
                      placeholder="https://calendly.com/your-link"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This will be used to schedule pitch meetings with startups
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <Label>Areas of Expertise</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {expertiseOptions.map(expertise => (
                        <Badge
                          key={expertise}
                          variant={formData.expertise.includes(expertise) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem(
                            formData.expertise, 
                            expertise, 
                            (items) => setFormData(prev => ({ ...prev, expertise: items }))
                          )}
                        >
                          {expertise}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Investment Stages</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {investmentStageOptions.map(stage => (
                        <Badge
                          key={stage}
                          variant={formData.investment_stages.includes(stage) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem(
                            formData.investment_stages, 
                            stage, 
                            (items) => setFormData(prev => ({ ...prev, investment_stages: items }))
                          )}
                        >
                          {stage}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button type="submit" disabled={saving} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Evaluation Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Evaluation Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{completionRate.toFixed(0)}%</div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                  <div className="text-sm text-muted-foreground text-center">
                    {stats.completed} of {stats.total_assigned} evaluations completed
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Total Assigned</span>
                  </div>
                  <Badge variant="outline">{stats.total_assigned}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{stats.completed}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm">In Progress</span>
                  </div>
                  <Badge variant="secondary">{stats.draft}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Average Score</span>
                  </div>
                  <Badge variant="outline">
                    {stats.average_score > 0 ? stats.average_score.toFixed(1) : '0.0'}/10
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/evaluate'}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Start Evaluations
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/sessions'}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Sessions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VCProfile;