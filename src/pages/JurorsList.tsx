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
import { UserCheck, Building, Users, Plus, Search, Filter, Upload, Download, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
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
}

export default function JurorsList() {
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [filteredJurors, setFilteredJurors] = useState<Juror[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [draftData, setDraftData] = useState<Partial<Juror>[]>([]);
  const [editingJuror, setEditingJuror] = useState<Juror | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jurorToDelete, setJurorToDelete] = useState<Juror | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchJurors();
  }, []);

  useEffect(() => {
    filterJurors();
  }, [jurors, searchTerm, companyFilter]);

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
        const { error } = await supabase
          .from('jurors')
          .update(data)
          .eq('id', editingJuror.id);
        
        if (error) throw error;
        
        toast({
          title: "Juror updated",
          description: "The juror has been successfully updated.",
        });
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
        
        toast({
          title: "Juror added",
          description: "The juror has been successfully added.",
        });
      }
      
      // Refresh the list
      fetchJurors();
      setEditingJuror(null);
    } catch (error) {
      console.error('Error saving juror:', error);
      toast({
        title: "Error",
        description: "There was an error saving the juror.",
        variant: "destructive",
      });
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

  // Get unique companies for filter
  const companies = [...new Set(jurors.filter(j => j.company).map(j => j.company))];

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
            <div className="flex gap-4">
              <Select value={companyFilter || 'all'} onValueChange={(value) => setCompanyFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company || 'unknown'}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchTerm || companyFilter) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setCompanyFilter('');
                  }}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJurors.map((juror) => (
                  <TableRow key={juror.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{juror.name}</TableCell>
                    <TableCell>{juror.email}</TableCell>
                    <TableCell>{juror.job_title || '-'}</TableCell>
                    <TableCell>
                      {juror.company ? (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {juror.company}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(juror.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(juror)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(juror)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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