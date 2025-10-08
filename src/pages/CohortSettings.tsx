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
import { CMFormModal } from '@/components/cm-management/CMFormModal';
import { CMsTable } from '@/components/cm-management/CMsTable';
import { CMCSVUploadModal } from '@/components/cm-management/CMCSVUploadModal';
import { CMDraftModal } from '@/components/cm-management/CMDraftModal';
import { RolePromotionDialog } from '@/components/cm-management/RolePromotionDialog';
import { downloadCMTemplate } from '@/utils/cmsCsvTemplate';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function CohortSettings() {
  const navigate = useNavigate();
  const { profile: userProfile, loading: profileLoading } = useUserProfile();
  const { toast } = useToast();
  const { cohortSettings, isLoading, updateCohortSettings, isUpdating } = useCohortSettings();
  const { resetCohort, isResetting } = useCohortReset();
  const [showResetModal, setShowResetModal] = useState(false);
  const [formData, setFormData] = useState<CohortSettingsInput>({
    cohort_name: '',
    screening_deadline: null,
    pitching_deadline: null
  });

  // CM Management State
  const queryClient = useQueryClient();
  const [cmFormOpen, setCmFormOpen] = useState(false);
  const [cmCsvUploadOpen, setCmCsvUploadOpen] = useState(false);
  const [cmDraftOpen, setCmDraftOpen] = useState(false);
  const [cmDraftData, setCmDraftData] = useState<any[]>([]);
  const [editingCM, setEditingCM] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [userToPromote, setUserToPromote] = useState<any>(null);

  useEffect(() => {
    if (userProfile && !['admin', 'cm'].includes(userProfile.role)) {
      navigate('/dashboard');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only administrators and community managers can access settings'
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResetConfirm = () => {
    if (cohortSettings) {
      resetCohort({ cohortId: cohortSettings.id, cohortName: cohortSettings.cohort_name });
      setShowResetModal(false);
    }
  };

  // Unified User Management - Fetch ALL users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-platform-users'],
    queryFn: async () => {
      // Fetch all user roles
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Fetch all jurors
      const { data: jurorsData, error: jurorsError } = await supabase
        .from('jurors')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (jurorsError) throw jurorsError;

      // Fetch all community managers
      const { data: cmsData, error: cmsError } = await supabase
        .from('community_managers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (cmsError) throw cmsError;

      // Create a map of user roles
      const rolesMap = new Map(userRolesData?.map(r => [r.user_id, r.role]) || []);

      // Merge and normalize data
      const unifiedUsers = [];

      // Add jurors
      for (const juror of jurorsData || []) {
        const role = juror.user_id ? (rolesMap.get(juror.user_id) || 'vc') : 'vc';
        unifiedUsers.push({
          id: juror.id,
          user_id: juror.user_id,
          name: juror.name,
          email: juror.email,
          organization: juror.company,
          job_title: juror.job_title,
          linkedin_url: juror.linkedin_url,
          invitation_sent_at: juror.invitation_sent_at,
          invitation_expires_at: juror.invitation_expires_at,
          role: role as 'admin' | 'cm' | 'vc',
          source_table: 'jurors' as const,
          permissions: {
            can_manage_startups: false,
            can_manage_jurors: false,
            can_invite_cms: false
          }
        });
      }

      // Add community managers (exclude duplicates if they're also jurors)
      for (const cm of cmsData || []) {
        const role = cm.user_id ? (rolesMap.get(cm.user_id) || 'cm') : 'cm';
        // Only add if not already added as juror
        const existingUser = unifiedUsers.find(u => u.user_id && u.user_id === cm.user_id);
        if (!existingUser) {
          unifiedUsers.push({
            id: cm.id,
            user_id: cm.user_id,
            name: cm.name,
            email: cm.email,
            organization: cm.organization,
            job_title: cm.job_title,
            linkedin_url: cm.linkedin_url,
            invitation_sent_at: cm.invitation_sent_at,
            invitation_expires_at: cm.invitation_expires_at,
            role: role as 'admin' | 'cm' | 'vc',
            source_table: 'community_managers' as const,
            permissions: cm.permissions as { can_manage_startups: boolean; can_manage_jurors: boolean; can_invite_cms: boolean; }
          });
        }
      }

      return unifiedUsers;
    }
  });

  const createCMMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('community_managers').insert({ ...data, permissions: data.permissions || { can_manage_startups: true, can_manage_jurors: true, can_invite_cms: false } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-managers'] });
      toast({ title: 'Success', description: 'Community Manager added successfully' });
    }
  });

  const updateCMMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('community_managers').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-managers'] });
      toast({ title: 'Success', description: 'CM updated successfully' });
      setEditingCM(null);
    }
  });

  const deleteCMMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('community_managers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-managers'] });
      toast({ title: 'Success', description: 'CM deleted successfully' });
    }
  });

  const sendCMInvitationMutation = useMutation({
    mutationFn: async (cm: any) => {
      const { error } = await supabase.functions.invoke('send-cm-invitation', {
        body: { cmName: cm.name, cmEmail: cm.email, organization: cm.organization, jobTitle: cm.job_title }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-platform-users'] });
      toast({ title: 'Success', description: 'Invitation sent successfully' });
    }
  });

  const promoteToOMMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      jurorId, 
      jurorData,
      permissions 
    }: { 
      userId: string; 
      jurorId: string; 
      jurorData: any;
      permissions: { can_manage_startups: boolean; can_manage_jurors: boolean; can_invite_cms: boolean; }
    }) => {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Update role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'cm' })
        .eq('user_id', userId);
      
      if (roleError) throw roleError;

      // Step 2: Create community_managers record
      const { error: cmError } = await supabase
        .from('community_managers')
        .insert({
          user_id: userId,
          name: jurorData.name,
          email: jurorData.email,
          organization: jurorData.organization,
          job_title: jurorData.job_title,
          linkedin_url: jurorData.linkedin_url,
          permissions: permissions
        });
      
      if (cmError) throw cmError;

      // Step 3: Log to audit table
      const { error: auditError } = await supabase
        .from('role_change_audit')
        .insert({
          user_id: userId,
          changed_by: user.id,
          previous_role: 'vc',
          new_role: 'cm',
          permissions_granted: permissions,
          reason: 'Promoted from Juror to Community Manager'
        });
      
      if (auditError) {
        console.error('Failed to log audit entry:', auditError);
        // Don't throw - audit log failure shouldn't block promotion
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-platform-users'] });
      setPromotionDialogOpen(false);
      setUserToPromote(null);
      toast({ 
        title: 'Success', 
        description: 'User promoted to Community Manager successfully' 
      });
    },
    onError: (error) => {
      console.error('Promotion error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to promote user. Please try again.'
      });
    }
  });

  const filteredUsers = allUsers.filter((user: any) => {
    // Search filter
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.organization?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handlePromoteUser = (user: any) => {
    setUserToPromote(user);
    setPromotionDialogOpen(true);
  };

  const handlePromoteConfirm = (permissions: { can_manage_startups: boolean; can_manage_jurors: boolean; can_invite_cms: boolean }) => {
    if (userToPromote && userToPromote.user_id) {
      promoteToOMMutation.mutate({
        userId: userToPromote.user_id,
        jurorId: userToPromote.id,
        jurorData: userToPromote,
        permissions
      });
    }
  };

  if (isLoading || profileLoading) return <LoadingModal open={true} title="Loading settings..." />;
  if (userProfile && !['admin', 'cm'].includes(userProfile.role)) return null;

  return (
    <div className="container mx-auto py-6 px-4">
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
          <TabsTrigger value="cms"><Users className="w-4 h-4 mr-2" />User Permissions</TabsTrigger>
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

        <TabsContent value="cms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Permissions</CardTitle>
                  <CardDescription>Manage all platform users and their permissions. Only admins and CMs can change permissions.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => downloadCMTemplate()}><Download className="h-4 w-4 mr-2" />Template</Button>
                  <Button variant="outline" onClick={() => setCmCsvUploadOpen(true)}><Upload className="h-4 w-4 mr-2" />Upload</Button>
                  <Button onClick={() => { setEditingCM(null); setCmFormOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add User</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input 
                  placeholder="Search by name, email, or organization..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="max-w-md" 
                />
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">All Users</option>
                  <option value="admin">Admins</option>
                  <option value="cm">Community Managers</option>
                  <option value="vc">Jurors</option>
                </select>
              </div>
              <CMsTable 
                cms={filteredUsers} 
                onEdit={(cm) => { setEditingCM(cm); setCmFormOpen(true); }} 
                onDelete={(id) => deleteCMMutation.mutate(id)} 
                onSendInvitation={(cm) => sendCMInvitationMutation.mutate(cm)}
                onPromote={userProfile?.role === 'admin' ? handlePromoteUser : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <ZohoExportTab />
        </TabsContent>
      </Tabs>

      {cohortSettings && <CohortResetConfirmationModal open={showResetModal} onOpenChange={setShowResetModal} cohortName={cohortSettings.cohort_name} onConfirm={handleResetConfirm} isLoading={isResetting} />}
      
      <CMFormModal open={cmFormOpen} onOpenChange={(open) => { setCmFormOpen(open); if (!open) setEditingCM(null); }} onSubmit={(data) => editingCM ? updateCMMutation.mutate({ id: editingCM.id, data }) : createCMMutation.mutate(data)} initialData={editingCM} mode={editingCM ? 'edit' : 'create'} />
      <CMCSVUploadModal open={cmCsvUploadOpen} onOpenChange={setCmCsvUploadOpen} onDataParsed={(data) => { setCmDraftData(data); setCmDraftOpen(true); }} />
      <CMDraftModal open={cmDraftOpen} onOpenChange={setCmDraftOpen} draftData={cmDraftData} onImportComplete={() => { queryClient.invalidateQueries({ queryKey: ['all-platform-users'] }); setCmDraftData([]); }} />
      
      <RolePromotionDialog 
        open={promotionDialogOpen}
        onOpenChange={setPromotionDialogOpen}
        user={userToPromote}
        onConfirm={handlePromoteConfirm}
        isLoading={promoteToOMMutation.isPending}
      />
    </div>
  );
}
