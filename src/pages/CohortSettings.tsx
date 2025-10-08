import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Save, Download, Trash2, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCohortSettings, CohortSettingsInput } from '@/hooks/useCohortSettings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatDateForInput } from '@/utils/deadlineUtils';
import { LoadingModal } from '@/components/ui/loading-modal';
import { useToast } from '@/hooks/use-toast';
import { ZohoExportTab } from '@/components/cohort/ZohoExportTab';
import { CohortResetConfirmationModal } from '@/components/cohort/CohortResetConfirmationModal';
import { useCohortReset } from '@/hooks/useCohortReset';
import { MatchmakingConfigCard } from '@/components/cohort/MatchmakingConfigCard';
import { Settings } from 'lucide-react';
import CMManagementTab from '@/components/cm/CMManagementTab';
export default function CohortSettings() {
  const navigate = useNavigate();
  const {
    profile: userProfile,
    loading: profileLoading
  } = useUserProfile();
  const {
    toast
  } = useToast();
  const {
    cohortSettings,
    isLoading,
    updateCohortSettings,
    isUpdating
  } = useCohortSettings();
  const {
    resetCohort,
    isResetting
  } = useCohortReset();
  const [showResetModal, setShowResetModal] = useState(false);
  const [formData, setFormData] = useState<CohortSettingsInput>({
    cohort_name: '',
    screening_deadline: null,
    pitching_deadline: null
  });

  // Redirect if not admin
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      navigate('/dashboard');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only administrators can access cohort settings'
      });
    }
  }, [userProfile, navigate, toast]);

  // Populate form when data loads
  useEffect(() => {
    if (cohortSettings) {
      setFormData({
        cohort_name: cohortSettings.cohort_name,
        screening_deadline: cohortSettings.screening_deadline,
        pitching_deadline: cohortSettings.pitching_deadline
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
  const handleResetConfirm = () => {
    if (cohortSettings) {
      resetCohort({
        cohortId: cohortSettings.id,
        cohortName: cohortSettings.cohort_name
      });
      setShowResetModal(false);
    }
  };
  if (isLoading || profileLoading) {
    return <LoadingModal open={true} title="Loading cohort settings..." />;
  }
  if (userProfile?.role !== 'admin') {
    return null; // Will redirect
  }
  return <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Cohort Settings</h1>
          <p className="text-muted-foreground">
            Configure cohort details and export data
          </p>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Tabbed Interface */}
      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Cohort Configuration
          </TabsTrigger>
          <TabsTrigger value="matchmaking" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Matchmaking Scoring
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Zoho Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <div className="max-w-2xl space-y-6">
            <Card>
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
                    <Input id="cohort_name" type="text" value={formData.cohort_name} onChange={e => handleInputChange('cohort_name', e.target.value)} placeholder="e.g., Aurora Tech Awards 2025 Cohort" required />
                    <p className="text-xs text-muted-foreground">
                      This name will appear on dashboards and in communications
                    </p>
                  </div>

                  {/* Screening Deadline */}
                  <div className="space-y-2">
                    <Label htmlFor="screening_deadline">Screening Round Deadline</Label>
                    <Input id="screening_deadline" type="date" value={formData.screening_deadline ? formatDateForInput(formData.screening_deadline) : ''} onChange={e => handleInputChange('screening_deadline', e.target.value || null)} />
                    <p className="text-xs text-muted-foreground">
                      Last date for jurors to complete screening evaluations
                    </p>
                  </div>

                  {/* Pitching Deadline */}
                  <div className="space-y-2">
                    <Label htmlFor="pitching_deadline">Pitching Round Deadline</Label>
                    <Input id="pitching_deadline" type="date" value={formData.pitching_deadline ? formatDateForInput(formData.pitching_deadline) : ''} onChange={e => handleInputChange('pitching_deadline', e.target.value || null)} />
                    <p className="text-xs text-muted-foreground">
                      Last date for jurors to complete pitching evaluations
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isUpdating} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {isUpdating ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Reset Cohort Data</CardTitle>
                
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-base text-gray-500">Irreversible actions that affect cohort data
                  </h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete all startups, jurors, evaluations, and communications for this cohort. 
                      Cohort settings will remain intact. This action cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setShowResetModal(true)} disabled={!cohortSettings || isResetting} className="shrink-0">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matchmaking">
          <MatchmakingConfigCard />
        </TabsContent>

        <TabsContent value="team">
          <CMManagementTab />
        </TabsContent>

        <TabsContent value="export">
          <ZohoExportTab />
        </TabsContent>
      </Tabs>

      {cohortSettings && <CohortResetConfirmationModal open={showResetModal} onOpenChange={setShowResetModal} cohortName={cohortSettings.cohort_name} onConfirm={handleResetConfirm} isLoading={isResetting} />}
    </div>;
}