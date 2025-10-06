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
import { Building, MapPin, Users, DollarSign, Calendar, Upload, Plus, Download, Edit, Trash2, Search, Filter, Linkedin, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CSVUploadModal } from '@/components/startups/CSVUploadModal';
import { StartupFormModal } from '@/components/startups/StartupFormModal';
import { DraftModal } from '@/components/startups/DraftModal';
import { downloadStartupTemplate } from '@/utils/csvTemplate';
import { useToast } from '@/hooks/use-toast';
import { getStageColor } from '@/utils/stageUtils';
import { getStatusColor } from '@/utils/statusUtils';
import { FilterPanel } from '@/components/common/FilterPanel';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AURORA_VERTICALS, BUSINESS_MODELS, CURRENCIES } from '@/constants/startupConstants';
import { StatusBadge } from '@/components/common/StatusBadge';
import { normalizeRegions } from '@/utils/fieldNormalization';

interface Startup {
  id: string;
  name: string;
  description: string | null;
  industry?: string | null;
  stage: string | null;
  location: string | null;
  founded_year: number | null;
  team_size: number | null;
  funding_goal: number | null;
  status: string | null;
  founder_names: string[] | null;
  linkedin_url: string | null;
  business_model: string[] | null;
  verticals: string[] | null;
  other_vertical_description: string | null;
  regions: string[] | null;
}

export default function StartupsList() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [filteredStartups, setFilteredStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [businessModelFilter, setBusinessModelFilter] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [hasLinkedInFilter, setHasLinkedInFilter] = useState('');
  const [investmentMinFilter, setInvestmentMinFilter] = useState('');
  const [investmentMaxFilter, setInvestmentMaxFilter] = useState('');
  const [selectedRound, setSelectedRound] = useState<'screening' | 'pitching'>('screening');
  const [roundStatuses, setRoundStatuses] = useState<Map<string, string>>(new Map());
  
  // Modal states
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftData, setDraftData] = useState<Partial<Startup>[]>([]);
  const [editingStartup, setEditingStartup] = useState<Startup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [startupToDelete, setStartupToDelete] = useState<Startup | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<{
    screeningEvaluations: number;
    pitchingEvaluations: number;
    screeningAssignments: number;
    pitchingAssignments: number;
    pitchMeetings: number;
  } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const { toast } = useToast();
  const { profile } = useUserProfile();
  
  // Check if user has admin permissions
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const evaluationTable = selectedRound === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
        let startupsData, startupsError;

        if (selectedRound === 'pitching') {
          // For pitching round: ONLY show startups that were SELECTED in screening round
          const { data, error } = await supabase
            .from('startups')
            .select(`
              *,
              startup_round_statuses!inner(
                status,
                rounds!inner(name)
              )
            `)
            .eq('startup_round_statuses.rounds.name', 'screening')
            .eq('startup_round_statuses.status', 'selected')
            .order('created_at', { ascending: false });
          
          startupsData = data;
          startupsError = error;
        } else {
          // For screening round: show ALL startups
          const { data, error } = await supabase
            .from('startups')
            .select('*')
            .order('created_at', { ascending: false });
          
          startupsData = data;
          startupsError = error;
        }

        if (startupsError) {
          console.error('Error fetching startups:', startupsError);
          setStartups([]);
        } else {
          // Normalize regions on fetch for consistent display and filtering
          const normalizedStartups = (startupsData || []).map(startup => ({
            ...startup,
            regions: startup.regions ? normalizeRegions(startup.regions) : []
          }));
          setStartups(normalizedStartups);
        }

        // Fetch evaluation statuses for status display
        const { data: evaluationData, error: evalError } = await supabase
          .from(evaluationTable)
          .select('startup_id, status');

        if (!evalError && evaluationData) {
          const statusMap = new Map();
          evaluationData.forEach(item => {
            const existingStatus = statusMap.get(item.startup_id);
            // Priority: submitted > draft
            if (!existingStatus || (item.status === 'submitted' && existingStatus === 'draft')) {
              statusMap.set(item.startup_id, item.status);
            }
          });
          // Set default status for startups without evaluations
          (startupsData || []).forEach(startup => {
            if (!statusMap.has(startup.id)) {
              statusMap.set(startup.id, 'not_evaluated');
            }
          });
          setRoundStatuses(statusMap);
        }
      } catch (error) {
        console.error('Error fetching startups:', error);
        setStartups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStartups();
  }, [selectedRound]);

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
      filtered = filtered.filter(startup => startup.verticals?.includes(industryFilter));
    }

    if (stageFilter && stageFilter !== 'all') {
      filtered = filtered.filter(startup => startup.stage === stageFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(startup => {
        const roundStatus = roundStatuses.get(startup.id) || 'pending';
        return roundStatus === statusFilter;
      });
    }

    if (businessModelFilter && businessModelFilter !== 'all') {
      filtered = filtered.filter(startup => (startup.business_model || []).includes(businessModelFilter));
    }

    if (verticalFilter && verticalFilter !== 'all') {
      filtered = filtered.filter(startup => 
        startup.verticals?.includes(verticalFilter)
      );
    }

    if (regionFilter && regionFilter !== 'all') {
      filtered = filtered.filter(startup => 
        startup.regions?.includes(regionFilter)
      );
    }

    if (hasLinkedInFilter && hasLinkedInFilter !== 'all') {
      if (hasLinkedInFilter === 'yes') {
        filtered = filtered.filter(startup => startup.linkedin_url);
      } else if (hasLinkedInFilter === 'no') {
        filtered = filtered.filter(startup => !startup.linkedin_url);
      }
    }

    setFilteredStartups(filtered);
  }, [
    startups, searchTerm, industryFilter, stageFilter, statusFilter, 
    businessModelFilter, verticalFilter, regionFilter, hasLinkedInFilter, 
    roundStatuses, selectedRound
  ]);

  const formatFunding = (amount: number | null, currency: string | null = 'USD') => {
    if (!amount) return 'N/A';
    const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
    if (amount >= 1000000) {
      return `${currencySymbol}${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(0)}K`;
    }
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  // Remove the old getStatusColor function as we're using the one from statusUtils

  // Get unique values for filters
  const industries = [...new Set(startups.filter(s => s.industry).map(s => s.industry))];
  const stages = [...new Set(startups.filter(s => s.stage).map(s => s.stage))];
  const statuses = ['not_evaluated', 'draft', 'submitted'];  // Use evaluation-based statuses
  const businessModels = [...new Set(startups.flatMap(s => s.business_model || []))];
  const allVerticals = startups.flatMap(s => s.verticals || []);
  const uniqueVerticals = [...new Set(allVerticals)];
  const allRegions = startups.flatMap(s => s.regions || []);
  const uniqueRegions = [...new Set(allRegions)];

  const clearAllFilters = () => {
    setIndustryFilter('');
    setStageFilter('');
    setStatusFilter('');
    setBusinessModelFilter('');
    setVerticalFilter('');
    setRegionFilter('');
    setHasLinkedInFilter('');
    setInvestmentMinFilter('');
    setInvestmentMaxFilter('');
  };

  const getActiveFilters = () => {
    const filters = [];
    if (selectedRound) filters.push({ label: 'Round', value: selectedRound === 'screening' ? 'Screening' : 'Pitching', onRemove: () => setSelectedRound('screening') });
    if (industryFilter && industryFilter !== 'all') filters.push({ label: 'Industry', value: industryFilter, onRemove: () => setIndustryFilter('') });
    if (stageFilter && stageFilter !== 'all') filters.push({ label: 'Stage', value: stageFilter, onRemove: () => setStageFilter('') });
    if (statusFilter && statusFilter !== 'all') filters.push({ label: 'Status', value: statusFilter, onRemove: () => setStatusFilter('') });
    if (businessModelFilter && businessModelFilter !== 'all') filters.push({ label: 'Business Model', value: businessModelFilter, onRemove: () => setBusinessModelFilter('') });
    if (verticalFilter && verticalFilter !== 'all') filters.push({ label: 'Vertical', value: verticalFilter, onRemove: () => setVerticalFilter('') });
    if (regionFilter && regionFilter !== 'all') filters.push({ label: 'Region', value: regionFilter, onRemove: () => setRegionFilter('') });
    if (hasLinkedInFilter && hasLinkedInFilter !== 'all') filters.push({ label: 'LinkedIn', value: hasLinkedInFilter === 'yes' ? 'Has LinkedIn' : 'No LinkedIn', onRemove: () => setHasLinkedInFilter('') });
    if (investmentMinFilter) filters.push({ label: 'Min Investment', value: `$${investmentMinFilter}`, onRemove: () => setInvestmentMinFilter('') });
    if (investmentMaxFilter) filters.push({ label: 'Max Investment', value: `$${investmentMaxFilter}`, onRemove: () => setInvestmentMaxFilter('') });
    return filters;
  };

  const handleCSVParsed = (data: Partial<Startup>[]) => {
    setDraftData(data);
    setDraftModalOpen(true);
  };

  const handleFormSubmit = async (data: Partial<Startup>) => {
    try {
      const payload: any = { ...data };
      if (payload.business_model && !Array.isArray(payload.business_model)) {
        payload.business_model = [payload.business_model];
      }
      if (editingStartup) {
        const { error } = await supabase
          .from('startups')
          .update(payload)
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

  const checkStartupDeletionImpact = async (startupId: string) => {
    setLoadingImpact(true);
    try {
      // Count screening evaluations
      const { count: screeningEvalCount } = await supabase
        .from('screening_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startupId);

      // Count pitching evaluations
      const { count: pitchingEvalCount } = await supabase
        .from('pitching_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startupId);

      // Count screening assignments
      const { count: screeningAssignCount } = await supabase
        .from('screening_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startupId);

      // Count pitching assignments
      const { count: pitchingAssignCount } = await supabase
        .from('pitching_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startupId);

      // Count pitch meetings
      const { count: pitchMeetingsCount } = await supabase
        .from('pitch_requests')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startupId);

      setDeletionImpact({
        screeningEvaluations: screeningEvalCount || 0,
        pitchingEvaluations: pitchingEvalCount || 0,
        screeningAssignments: screeningAssignCount || 0,
        pitchingAssignments: pitchingAssignCount || 0,
        pitchMeetings: pitchMeetingsCount || 0,
      });
    } catch (error) {
      console.error('Error checking deletion impact:', error);
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleDelete = async (startup: Startup) => {
    setStartupToDelete(startup);
    setDeleteDialogOpen(true);
    await checkStartupDeletionImpact(startup.id);
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
              <Button variant="outline" onClick={downloadStartupTemplate}>
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
                <Button variant="outline" onClick={downloadStartupTemplate}>
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
            onClearAll={clearAllFilters}
            activeFilters={getActiveFilters()}
          >
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Round</label>
                <Select value={selectedRound} onValueChange={(value: 'screening' | 'pitching') => setSelectedRound(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screening">Screening Round</SelectItem>
                    <SelectItem value="pitching">Pitching Round</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Business Model</label>
                <Select value={businessModelFilter || 'all'} onValueChange={(value) => setBusinessModelFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Models" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {businessModels.map(model => (
                      <SelectItem key={model} value={model || 'unknown'}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Vertical</label>
                <Select value={verticalFilter || 'all'} onValueChange={(value) => setVerticalFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Verticals" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Verticals</SelectItem>
                    {uniqueVerticals.map(vertical => (
                      <SelectItem key={vertical} value={vertical}>{vertical}</SelectItem>
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

            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Region</label>
                <Select value={regionFilter || 'all'} onValueChange={(value) => setRegionFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {uniqueRegions.map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">LinkedIn Profile</label>
                <Select value={hasLinkedInFilter || 'all'} onValueChange={(value) => setHasLinkedInFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="yes">Has LinkedIn</SelectItem>
                    <SelectItem value="no">No LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Min Investment</label>
                <Input
                  type="number"
                  placeholder="Minimum amount"
                  value={investmentMinFilter}
                  onChange={(e) => setInvestmentMinFilter(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Max Investment</label>
                <Input
                  type="number"
                  placeholder="Maximum amount"
                  value={investmentMaxFilter}
                  onChange={(e) => setInvestmentMaxFilter(e.target.value)}
                />
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
              <Link key={startup.id} to={`/startup/${startup.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold flex-1">
                        {startup.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <StatusBadge 
                          status={roundStatuses.get(startup.id) || 'pending'}
                          roundName={selectedRound}
                          showRoundContext={true}
                        />
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEdit(startup);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(startup);
                              }}
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
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    {startup.business_model && startup.business_model.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {startup.business_model[0]}
                      </Badge>
                    )}
                    {startup.stage && (
                      <Badge variant="outline" className={getStageColor(startup.stage)}>
                        {startup.stage}
                      </Badge>
                    )}
                  </div>

                  {startup.verticals && startup.verticals.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {startup.verticals.slice(0, 2).map((vertical, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {vertical.length > 20 ? vertical.substring(0, 20) + '...' : vertical}
                        </Badge>
                      ))}
                      {startup.verticals.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{startup.verticals.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
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
                  
                  <div className="space-y-2">
                    {startup.funding_goal && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>Seeking {formatFunding(startup.funding_goal)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {startup.founder_names && startup.founder_names.length > 0 && (
                      <div className="text-sm flex-1">
                        <span className="text-muted-foreground">Founders: </span>
                        <span className="font-medium">
                          {startup.founder_names.slice(0, 2).join(', ')}
                          {startup.founder_names.length > 2 && ` +${startup.founder_names.length - 2} more`}
                        </span>
                      </div>
                    )}
                    {startup.linkedin_url && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        className="h-8 w-8 p-0"
                      >
                        <a 
                          href={startup.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              </Link>
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
          <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setDeletionImpact(null);
            }
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Startup</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>Are you sure you want to delete "<strong>{startupToDelete?.name}</strong>"?</p>
                  
                  {loadingImpact ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="animate-spin">⏳</span>
                      <span>Checking data impact...</span>
                    </div>
                  ) : deletionImpact && (
                    <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
                      <p className="font-semibold text-sm">⚠️ This will affect:</p>
                      <ul className="space-y-1 text-sm">
                        {deletionImpact.screeningEvaluations > 0 && (
                          <li className="text-destructive">
                            🔴 {deletionImpact.screeningEvaluations} Screening Evaluation{deletionImpact.screeningEvaluations !== 1 ? 's' : ''} (will be lost)
                          </li>
                        )}
                        {deletionImpact.pitchingEvaluations > 0 && (
                          <li className="text-destructive">
                            🔴 {deletionImpact.pitchingEvaluations} Pitching Evaluation{deletionImpact.pitchingEvaluations !== 1 ? 's' : ''} (will be lost)
                          </li>
                        )}
                        {deletionImpact.screeningAssignments > 0 && (
                          <li className="text-yellow-600">
                            🟡 {deletionImpact.screeningAssignments} Screening Assignment{deletionImpact.screeningAssignments !== 1 ? 's' : ''} (will be removed)
                          </li>
                        )}
                        {deletionImpact.pitchingAssignments > 0 && (
                          <li className="text-yellow-600">
                            🟡 {deletionImpact.pitchingAssignments} Pitching Assignment{deletionImpact.pitchingAssignments !== 1 ? 's' : ''} (will be removed)
                          </li>
                        )}
                        {deletionImpact.pitchMeetings > 0 && (
                          <li className="text-destructive">
                            🔴 {deletionImpact.pitchMeetings} Pitch Meeting{deletionImpact.pitchMeetings !== 1 ? 's' : ''} (will be cancelled)
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <p className="text-destructive font-medium mt-4">This action cannot be undone.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDelete} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={loadingImpact}
                >
                  Delete Anyway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}