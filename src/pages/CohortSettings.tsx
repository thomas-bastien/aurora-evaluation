import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Save, Download, Trash2, Users, Upload, Plus, Settings } from 'lucide-react';
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
import { AdminFormModal } from '@/components/admin-management/AdminFormModal';
import { AdminsTable, Admin } from '@/components/admin-management/AdminsTable';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  // Admin Management State
  const queryClient = useQueryClient();
  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Admin Management
  const { data: admins = [] } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Admin[];
    }
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: Omit<Admin, 'id' | 'user_id' | 'invitation_token' | 'invitation_sent_at' | 'invitation_expires_at' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('admins')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Admin added successfully' });
      setAdminFormOpen(false);
    }
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Admin> }) => {
      const { error } = await supabase
        .from('admins')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Admin updated successfully' });
      setEditingAdmin(null);
      setAdminFormOpen(false);
    }
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Admin deleted successfully' });
    }
  });

  const sendAdminInvitationMutation = useMutation({
    mutationFn: async (admin: Admin) => {
      const { error } = await supabase.functions.invoke('send-admin-invitation', {
        body: {
          adminName: admin.name,
          adminEmail: admin.email,
          organization: admin.organization,
          jobTitle: admin.job_title,
          linkedinUrl: admin.linkedin_url
        }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Invitation sent successfully' });
    }
  });

  const filteredAdmins = admins.filter((admin: Admin) =>
    admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (isLoading || profileLoading) return <LoadingModal open={true} title="Loading cohort settings..." />;
  if (userProfile?.role !== 'admin') return null;
  return <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Cohort Settings</h1>
          <p className="text-muted-foreground">Configure cohort details and manage team</p>
        </div>
      </div>

      <Separator className="mb-6" />

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration"><Calendar className="w-4 h-4 mr-2" />Configuration</TabsTrigger>
          <TabsTrigger value="matchmaking"><Settings className="w-4 h-4 mr-2" />Matchmaking</TabsTrigger>
          <TabsTrigger value="admins"><Users className="w-4 h-4 mr-2" />Admin Management</TabsTrigger>
          <TabsTrigger value="export"><Download className="w-4 h-4 mr-2" />Zoho Export</TabsTrigger>
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

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Admin Management</CardTitle>
                  <CardDescription>Manage platform administrators who can configure cohorts and manage all data</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingAdmin(null);
                  setAdminFormOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Search by name, email, or organization..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="max-w-md" 
              />
              <AdminsTable 
                admins={filteredAdmins}
                onEdit={(admin) => {
                  setEditingAdmin(admin);
                  setAdminFormOpen(true);
                }}
                onDelete={(id) => deleteAdminMutation.mutate(id)}
                onSendInvitation={(admin) => sendAdminInvitationMutation.mutate(admin)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <ZohoExportTab />
        </TabsContent>
      </Tabs>

      {cohortSettings && (
        <CohortResetConfirmationModal 
          open={showResetModal} 
          onOpenChange={setShowResetModal} 
          cohortName={cohortSettings.cohort_name} 
          onConfirm={handleResetConfirm} 
          isLoading={isResetting} 
        />
      )}
      
      <AdminFormModal 
        open={adminFormOpen} 
        onOpenChange={(open) => {
          setAdminFormOpen(open);
          if (!open) setEditingAdmin(null);
        }} 
        onSubmit={(data) => 
          editingAdmin 
            ? updateAdminMutation.mutate({ id: editingAdmin.id, data }) 
            : createAdminMutation.mutate(data)
        } 
        editingAdmin={editingAdmin}
      />
    </div>;
}