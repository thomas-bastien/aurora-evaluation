import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCohortSettings, CohortSettingsInput } from '@/hooks/useCohortSettings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatDateForInput } from '@/utils/deadlineUtils';
import { LoadingModal } from '@/components/ui/loading-modal';
import { useToast } from '@/hooks/use-toast';

export default function CohortSettings() {
  const navigate = useNavigate();
  const { profile: userProfile, loading: profileLoading } = useUserProfile();
  const { toast } = useToast();
  const { cohortSettings, isLoading, updateCohortSettings, isUpdating } = useCohortSettings();
  
  const [formData, setFormData] = useState<CohortSettingsInput>({
    cohort_name: '',
    screening_deadline: null,
    pitching_deadline: null,
  });

  // Redirect if not admin
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/dashboard');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only administrators can access cohort settings',
      });
    }
  }, [userProfile, navigate, toast]);

  // Populate form when data loads
  useEffect(() => {
    if (cohortSettings) {
      setFormData({
        cohort_name: cohortSettings.cohort_name,
        screening_deadline: cohortSettings.screening_deadline,
        pitching_deadline: cohortSettings.pitching_deadline,
      });
    }
  }, [cohortSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCohortSettings(formData);
  };

  const handleInputChange = (field: keyof CohortSettingsInput, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading || profileLoading) {
    return <LoadingModal open={true} title="Loading cohort settings..." />;
  }

  if (userProfile?.role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Cohort Settings</h1>
          <p className="text-muted-foreground">
            Configure cohort details and round deadlines
          </p>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Settings Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Cohort Configuration
          </CardTitle>
          <CardDescription>
            Set the cohort name and deadlines for screening and pitching rounds. 
            These settings will be used across all dashboards and communications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cohort Name */}
            <div className="space-y-2">
              <Label htmlFor="cohort_name">Cohort Name</Label>
              <Input
                id="cohort_name"
                type="text"
                value={formData.cohort_name}
                onChange={(e) => handleInputChange('cohort_name', e.target.value)}
                placeholder="e.g., Aurora Tech Awards 2025 Cohort"
                required
              />
              <p className="text-xs text-muted-foreground">
                This name will appear on dashboards and in communications
              </p>
            </div>

            {/* Screening Deadline */}
            <div className="space-y-2">
              <Label htmlFor="screening_deadline">Screening Round Deadline</Label>
              <Input
                id="screening_deadline"
                type="date"
                value={formData.screening_deadline ? formatDateForInput(formData.screening_deadline) : ''}
                onChange={(e) => handleInputChange('screening_deadline', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Last date for jurors to complete screening evaluations
              </p>
            </div>

            {/* Pitching Deadline */}
            <div className="space-y-2">
              <Label htmlFor="pitching_deadline">Pitching Round Deadline</Label>
              <Input
                id="pitching_deadline"
                type="date"
                value={formData.pitching_deadline ? formatDateForInput(formData.pitching_deadline) : ''}
                onChange={(e) => handleInputChange('pitching_deadline', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Last date for jurors to complete pitching evaluations
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isUpdating ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}