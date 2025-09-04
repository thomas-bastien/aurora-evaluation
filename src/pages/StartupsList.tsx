import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Building, MapPin, Users, DollarSign, Calendar, Upload, Plus, Download, Edit, Trash2, Search, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CSVUploadModal } from '@/components/startups/CSVUploadModal';
import { StartupFormModal } from '@/components/startups/StartupFormModal';
import { DraftModal } from '@/components/startups/DraftModal';
import { downloadCSVTemplate } from '@/utils/csvTemplate';
import { useToast } from '@/hooks/use-toast';
import { getStageColor } from '@/utils/stageUtils';
import { FilterPanel } from '@/components/common/FilterPanel';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Startup {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  stage: string | null;
  location: string | null;
  founded_year: number | null;
  team_size: number | null;
  funding_goal: number | null;
  status: string | null;
  founder_names: string[] | null;
}

export default function StartupsList() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [filteredStartups, setFilteredStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftData, setDraftData] = useState<Partial<Startup>[]>([]);
  const [editingStartup, setEditingStartup] = useState<Startup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [startupToDelete, setStartupToDelete] = useState<Startup | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { toast } = useToast();
  const { profile } = useUserProfile();
  
  // Check if user has admin permissions
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const { data, error } = await supabase
          .from('startups')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching startups:', error);
        } else {
          setStartups(data || []);
        }
      } catch (error) {
        console.error('Error fetching startups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStartups();
  }, []);

  // Filter startups based on search and filters
  useEffect(() => {
    let filtered = startups;

    if (searchTerm) {
      filtered = filtered.filter(startup =>
        startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        startup.founder_names?.some(name => 
          name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (industryFilter && industryFilter !== 'all') {
      filtered = filtered.filter(startup => startup.industry === industryFilter);
    }

    if (stageFilter && stageFilter !== 'all') {
      filtered = filtered.filter(startup => startup.stage === stageFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(startup => startup.status === statusFilter);
    }

    setFilteredStartups(filtered);
  }, [startups, searchTerm, industryFilter, stageFilter, statusFilter]);

  const formatFunding = (amount: number | null) => {
    if (!amount) return 'N/A';
    return `$${(amount / 1000000).toFixed(1)}M`;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'under-review': return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Remove the old getStageColor function as we're using the one from stageUtils

  // Get unique values for filters
  const industries = [...new Set(startups.filter(s => s.industry).map(s => s.industry))];
  const stages = [...new Set(startups.filter(s => s.stage).map(s => s.stage))];
  const statuses = [...new Set(startups.filter(s => s.status).map(s => s.status))];

  const handleCSVParsed = (data: Partial<Startup>[]) => {
    setDraftData(data);
    setDraftModalOpen(true);
  };

  const handleFormSubmit = async (data: Partial<Startup>) => {
    try {
      if (editingStartup) {
        const { error } = await supabase
          .from('startups')
          .update(data)
          .eq('id', editingStartup.id);
        
        if (error) throw error;
        
        toast({
          title: "Startup updated",
          description: "The startup has been successfully updated.",
        });
      } else {
        // Ensure required fields are present
        const insertData = {
          ...data,
          name: data.name!,
          status: data.status || 'pending'
        };
        
        const { error } = await supabase
          .from('startups')
          .insert([insertData]);
        
        if (error) throw error;
        
        toast({
          title: "Startup added",
          description: "The startup has been successfully added.",
        });
      }
      
      // Refresh the list
      const { data: updatedData } = await supabase
        .from('startups')
        .select('*')
        .order('created_at', { ascending: false });
      
      setStartups(updatedData || []);
      setEditingStartup(null);
    } catch (error) {
      console.error('Error saving startup:', error);
      toast({
        title: "Error",
        description: "There was an error saving the startup.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (startup: Startup) => {
    setEditingStartup(startup);
    setFormModalOpen(true);
  };

  const handleDelete = (startup: Startup) => {
    setStartupToDelete(startup);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!startupToDelete) return;

    try {
      const { error } = await supabase
        .from('startups')
        .delete()
        .eq('id', startupToDelete.id);

      if (error) throw error;

      toast({
        title: "Startup deleted",
        description: "The startup has been successfully deleted.",
      });

      // Refresh the list
      const { data: updatedData } = await supabase
        .from('startups')
        .select('*')
        .order('created_at', { ascending: false });
      
      setStartups(updatedData || []);
    } catch (error) {
      console.error('Error deleting startup:', error);
      toast({
        title: "Error",
        description: "There was an error deleting the startup.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setStartupToDelete(null);
    }
  };

  const handleImportComplete = async () => {
    // Refresh the startups list
    const { data: updatedData } = await supabase
      .from('startups')
      .select('*')
      .order('created_at', { ascending: false });
    
    setStartups(updatedData || []);
    setDraftData([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Startups</h1>
              <p className="text-muted-foreground mt-2">Manage and review startup applications</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadCSVTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button variant="outline" onClick={() => setCsvModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
              <Button onClick={() => setFormModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Startup
              </Button>
            </div>
          </div>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-80">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Startups</h1>
              <p className="text-muted-foreground mt-2">
                {isAdmin ? 'Manage and review startup applications' : 'Browse startup profiles'}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadCSVTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button variant="outline" onClick={() => setCsvModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
                <Button onClick={() => setFormModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Startup
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search startups by name, description, or founder..."
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
          
          <FilterPanel
            isOpen={filtersOpen}
            onOpenChange={setFiltersOpen}
            onClearAll={() => {
              setSearchTerm('');
              setIndustryFilter('');
              setStageFilter('');
              setStatusFilter('');
            }}
            activeFilters={[
              ...(industryFilter ? [{ label: 'Industry', value: industryFilter, onRemove: () => setIndustryFilter('') }] : []),
              ...(stageFilter ? [{ label: 'Stage', value: stageFilter, onRemove: () => setStageFilter('') }] : []),
              ...(statusFilter ? [{ label: 'Status', value: statusFilter, onRemove: () => setStatusFilter('') }] : [])
            ]}
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Industry</label>
                <Select value={industryFilter || 'all'} onValueChange={(value) => setIndustryFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map(industry => (
                      <SelectItem key={industry} value={industry || 'unknown'}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Stage</label>
                <Select value={stageFilter || 'all'} onValueChange={(value) => setStageFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {stages.map(stage => (
                      <SelectItem key={stage} value={stage || 'unknown'}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status || 'unknown'}>
                        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('-', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPanel>
        </div>

        {filteredStartups.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No startups found</h3>
            <p className="text-muted-foreground">
              {startups.length === 0 
                ? "There are currently no startups in the system." 
                : "No startups match your current filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStartups.map((startup) => (
              <Card key={startup.id} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Link to={`/startup/${startup.id}`} className="flex-1">
                      <CardTitle className="text-lg font-semibold hover:text-primary cursor-pointer">
                        {startup.name}
                      </CardTitle>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(startup.status)}>
                        {startup.status?.replace('-', ' ') || 'pending'}
                      </Badge>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(startup)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(startup)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {startup.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {startup.stage && (
                      <Badge variant="outline" className={getStageColor(startup.stage)}>
                        {startup.stage}
                      </Badge>
                    )}
                    {startup.industry && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {startup.industry}
                      </span>
                    )}
                  </div>
                  
                  {startup.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {startup.location}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {startup.team_size && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{startup.team_size} people</span>
                      </div>
                    )}
                    {startup.founded_year && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{startup.founded_year}</span>
                      </div>
                    )}
                  </div>
                  
                  {startup.funding_goal && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span>Seeking {formatFunding(startup.funding_goal)}</span>
                    </div>
                  )}
                  
                  {startup.founder_names && startup.founder_names.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Founders: </span>
                      <span className="font-medium">
                        {startup.founder_names.join(', ')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Admin-only modals */}
      {isAdmin && (
        <>
          <CSVUploadModal
            open={csvModalOpen}
            onOpenChange={setCsvModalOpen}
            onDataParsed={handleCSVParsed}
          />
          
          <StartupFormModal
            open={formModalOpen}
            onOpenChange={setFormModalOpen}
            onSubmit={handleFormSubmit}
            initialData={editingStartup || undefined}
            mode={editingStartup ? 'edit' : 'create'}
          />
          
          <DraftModal
            open={draftModalOpen}
            onOpenChange={setDraftModalOpen}
            draftData={draftData}
            onImportComplete={handleImportComplete}
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Startup</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{startupToDelete?.name}"? This action cannot be undone.
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
        </>
      )}
    </div>
  );
}