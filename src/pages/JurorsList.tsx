import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { UserCheck, Building, Users, Plus, Search, Filter, Upload, Download, Edit, Trash2, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { CSVUploadModal } from '@/components/jurors/CSVUploadModal';
import { DraftModal } from '@/components/jurors/DraftModal';
import { JurorFormModal } from '@/components/jurors/JurorFormModal';
import { downloadJurorsCSVTemplate } from '@/utils/jurorsCsvTemplate';

interface Juror {
  id: string;
  name: string;
  email: string;
  job_title: string | null;
  company: string | null;
  created_at: string;
  user_id: string | null;
  invitation_token: string | null;
  invitation_sent_at: string | null;
  invitation_expires_at: string | null;
  preferred_regions: string[] | null;
  target_verticals: string[] | null;
  preferred_stages: string[] | null;
  linkedin_url: string | null;
}

export default function JurorsList() {
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [filteredJurors, setFilteredJurors] = useState<Juror[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [draftData, setDraftData] = useState<Partial<Juror>[]>([]);
  const [editingJuror, setEditingJuror] = useState<Juror | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jurorToDelete, setJurorToDelete] = useState<Juror | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useUserProfile();
  
  // Check if user has admin permissions
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchJurors();
  }, []);

  useEffect(() => {
    filterJurors();
  }, [jurors, searchTerm, companyFilter, regionFilter, verticalFilter, stageFilter]);

  const fetchJurors = async () => {
    try {
      const { data, error } = await supabase
        .from('jurors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jurors:', error);
        toast({
          title: "Error",
          description: "Failed to fetch jurors",
          variant: "destructive"
        });
      } else {
        setJurors(data || []);
      }
    } catch (error) {
      console.error('Error fetching jurors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jurors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getJurorStatus = (juror: Juror) => {
    if (juror.user_id) {
      return { text: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' };
    } else if (juror.invitation_sent_at) {
      const now = new Date();
      const expiresAt = juror.invitation_expires_at ? new Date(juror.invitation_expires_at) : null;
      
      if (expiresAt && now > expiresAt) {
        return { text: 'Invitation Expired', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
      } else {
        return { text: 'Invitation Sent', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
      }
    } else {
      return { text: 'Not Invited', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const filterJurors = () => {
    let filtered = jurors;

    if (searchTerm) {
      filtered = filtered.filter(juror =>
        juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        juror.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (juror.company && juror.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (juror.job_title && juror.job_title.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (companyFilter && companyFilter !== 'all') {
      filtered = filtered.filter(juror => juror.company === companyFilter);
    }

    if (regionFilter && regionFilter !== 'all') {
      filtered = filtered.filter(juror => 
        juror.preferred_regions && juror.preferred_regions.includes(regionFilter)
      );
    }

    if (verticalFilter && verticalFilter !== 'all') {
      filtered = filtered.filter(juror => 
        juror.target_verticals && juror.target_verticals.includes(verticalFilter)
      );
    }

    if (stageFilter && stageFilter !== 'all') {
      filtered = filtered.filter(juror => 
        juror.preferred_stages && juror.preferred_stages.includes(stageFilter)
      );
    }

    setFilteredJurors(filtered);
  };


  const handleCSVParsed = (data: Partial<Juror>[]) => {
    setDraftData(data);
    setDraftModalOpen(true);
  };

  const handleImportComplete = async () => {
    // Refresh the jurors list
    fetchJurors();
    setDraftData([]);
  };

  const handleFormSubmit = async (data: Partial<Juror>) => {
    try {
      if (editingJuror) {
        const emailChanged = editingJuror.email !== data.email;
        
        const { error } = await supabase
          .from('jurors')
          .update(data)
          .eq('id', editingJuror.id);
        
        if (error) throw error;
        
        // If email was changed, offer to send invitation
        if (emailChanged) {
          try {
            const emailResponse = await supabase.functions.invoke('send-juror-invitation', {
              body: {
                jurorName: data.name!,
                jurorEmail: data.email!,
                company: data.company,
                jobTitle: data.job_title
              }
            });
            
            if (emailResponse.error) {
              console.error('Failed to send invitation email:', emailResponse.error);
              toast({
                title: "Juror updated",
                description: "The juror has been updated, but the invitation email failed to send to the new address.",
                variant: "destructive"
              });
            } else {
              toast({
                title: "Juror updated & invited",
                description: "The juror has been updated and an invitation email has been sent to the new address.",
              });
            }
          } catch (emailError) {
            console.error('Error sending invitation email:', emailError);
            toast({
              title: "Juror updated",
              description: "The juror has been updated, but the invitation email failed to send to the new address.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Juror updated",
            description: "The juror has been successfully updated.",
          });
        }
      } else {
        // Ensure required fields are present
        const insertData = {
          name: data.name!,
          email: data.email!,
          job_title: data.job_title || null,
          company: data.company || null
        };
        
        const { error } = await supabase
          .from('jurors')
          .insert([insertData]);
        
        if (error) throw error;
        
        // Send invitation email for new jurors
        try {
          const emailResponse = await supabase.functions.invoke('send-juror-invitation', {
            body: {
              jurorName: insertData.name,
              jurorEmail: insertData.email,
              company: insertData.company,
              jobTitle: insertData.job_title
            }
          });
          
          if (emailResponse.error) {
            console.error('Failed to send invitation email:', emailResponse.error);
            toast({
              title: "Juror added",
              description: "The juror has been added, but the invitation email failed to send.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Juror added & invited",
              description: "The juror has been successfully added and an invitation email has been sent.",
            });
          }
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);
          toast({
            title: "Juror added",
            description: "The juror has been added, but the invitation email failed to send.",
            variant: "destructive"
          });
        }
      }
      
      // Refresh the list
      fetchJurors();
      setEditingJuror(null);
    } catch (error: any) {
      console.error('Error saving juror:', error);
      
      // Check if it's a duplicate email constraint violation
      if (error?.code === '23505' && error?.message?.includes('jurors_email_key')) {
        toast({
          title: "Email already exists",
          description: "A juror with this email address already exists in the system.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "There was an error saving the juror.",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (juror: Juror) => {
    setEditingJuror(juror);
    setFormModalOpen(true);
  };

  const handleDelete = (juror: Juror) => {
    setJurorToDelete(juror);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!jurorToDelete) return;

    try {
      const { error } = await supabase
        .from('jurors')
        .delete()
        .eq('id', jurorToDelete.id);

      if (error) throw error;

      toast({
        title: "Juror deleted",
        description: "The juror has been successfully deleted.",
      });

      // Refresh the list
      fetchJurors();
    } catch (error) {
      console.error('Error deleting juror:', error);
      toast({
        title: "Error",
        description: "There was an error deleting the juror.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setJurorToDelete(null);
    }
  };

  // Get unique values for filters
  const companies = [...new Set(jurors.filter(j => j.company).map(j => j.company))];
  const regions = [...new Set(jurors.flatMap(j => j.preferred_regions || []))];
  const verticals = [...new Set(jurors.flatMap(j => j.target_verticals || []))]; 
  const stages = [...new Set(jurors.flatMap(j => j.preferred_stages || []))];

  const handleSendInvitation = async (juror: Juror) => {
    setSendingInvitation(juror.id);
    
    try {
      const emailResponse = await supabase.functions.invoke('send-juror-invitation', {
        body: {
          jurorName: juror.name,
          jurorEmail: juror.email,
          company: juror.company,
          jobTitle: juror.job_title
        }
      });
      
      if (emailResponse.error) {
        console.error('Failed to send invitation email:', emailResponse.error);
        toast({
          title: "Failed to send invitation",
          description: "There was an error sending the invitation email.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invitation sent",
          description: `An invitation email has been sent to ${juror.name}.`,
        });
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
      toast({
        title: "Failed to send invitation",
        description: "There was an error sending the invitation email.",
        variant: "destructive"
      });
    } finally {
      setSendingInvitation(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Jury</h1>
            <p className="text-muted-foreground mt-2">Manage evaluation panel members</p>
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Jury</h1>
              <p className="text-muted-foreground mt-2">Manage evaluation panel members</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadJurorsCSVTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button variant="outline" onClick={() => setCsvModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
                <Button onClick={() => setFormModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Juror
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search jurors by name, email, company, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {filtersOpen && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={companyFilter || 'all'} onValueChange={(value) => setCompanyFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company || 'unknown'}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={regionFilter || 'all'} onValueChange={(value) => setRegionFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={verticalFilter || 'all'} onValueChange={(value) => setVerticalFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verticals</SelectItem>
                  {verticals.map(vertical => (
                    <SelectItem key={vertical} value={vertical}>{vertical}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stageFilter || 'all'} onValueChange={(value) => setStageFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchTerm || companyFilter || regionFilter || verticalFilter || stageFilter) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setCompanyFilter('');
                    setRegionFilter('');
                    setVerticalFilter('');
                    setStageFilter('');
                  }}
                  className="md:col-span-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>

        {filteredJurors.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              {searchTerm ? 'No jurors found' : 'No jurors yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Try adjusting your search criteria' 
                : 'Start by inviting evaluation panel members.'
              }
            </p>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Member Since</TableHead>
                  {isAdmin && <TableHead className="w-[140px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredJurors.map((juror) => (
                  <TableRow 
                    key={juror.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => window.location.href = `/juror/${juror.id}`}
                  >
                    <TableCell className="font-medium">{juror.name}</TableCell>
                    <TableCell>{juror.email}</TableCell>
                    <TableCell>{juror.job_title || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {juror.preferred_regions && juror.preferred_regions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {juror.preferred_regions.slice(0, 2).map(region => (
                              <Badge key={region} variant="secondary" className="text-xs">
                                {region}
                              </Badge>
                            ))}
                            {juror.preferred_regions.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{juror.preferred_regions.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        {juror.target_verticals && juror.target_verticals.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {juror.target_verticals.slice(0, 2).map(vertical => (
                              <Badge key={vertical} variant="outline" className="text-xs">
                                {vertical}
                              </Badge>
                            ))}
                            {juror.target_verticals.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{juror.target_verticals.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        {(!juror.preferred_regions || juror.preferred_regions.length === 0) && 
                         (!juror.target_verticals || juror.target_verticals.length === 0) && (
                          <span className="text-sm text-muted-foreground">No preferences set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = getJurorStatus(juror);
                        return (
                          <Badge variant={status.variant} className={status.color}>
                            <UserCheck className="h-3 w-3 mr-1" />
                            {status.text}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(juror.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendInvitation(juror)}
                            disabled={sendingInvitation === juror.id}
                            className="h-8 w-8 p-0"
                            title="Send Invitation"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(juror)}
                            className="h-8 w-8 p-0"
                            title="Edit Juror"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(juror)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Delete Juror"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>

      {/* CSV Upload Modal */}
      <CSVUploadModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onDataParsed={handleCSVParsed}
      />
      
      {/* Draft Review Modal */}
      <DraftModal
        open={draftModalOpen}
        onOpenChange={setDraftModalOpen}
        draftData={draftData}
        onImportComplete={handleImportComplete}
      />

      {/* Juror Form Modal */}
      <JurorFormModal
        open={formModalOpen}
        onOpenChange={(open) => {
          setFormModalOpen(open);
          if (!open) setEditingJuror(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingJuror || undefined}
        mode={editingJuror ? 'edit' : 'create'}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Juror</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {jurorToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}