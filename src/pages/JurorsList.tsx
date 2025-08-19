import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, Building, Users, Plus, Search, Filter, Upload, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CSVUploadModal } from '@/components/jurors/CSVUploadModal';
import { DraftModal } from '@/components/jurors/DraftModal';
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
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftData, setDraftData] = useState<Partial<Juror>[]>([]);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    job_title: '',
    company: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchJurors();
  }, []);

  useEffect(() => {
    filterJurors();
  }, [jurors, searchTerm]);

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
    if (!searchTerm) {
      setFilteredJurors(jurors);
      return;
    }

    const filtered = jurors.filter(juror =>
      juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      juror.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (juror.company && juror.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (juror.job_title && juror.job_title.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredJurors(filtered);
  };

  const handleInviteJuror = async () => {
    if (!inviteForm.name || !inviteForm.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('jurors')
        .insert([{
          name: inviteForm.name,
          email: inviteForm.email,
          job_title: inviteForm.job_title || null,
          company: inviteForm.company || null
        }]);

      if (error) {
        console.error('Error inviting juror:', error);
        toast({
          title: "Error",
          description: "Failed to invite juror",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Juror invited successfully"
        });
        setIsInviteDialogOpen(false);
        setInviteForm({ name: '', email: '', job_title: '', company: '' });
        fetchJurors();
      }
    } catch (error) {
      console.error('Error inviting juror:', error);
      toast({
        title: "Error",
        description: "Failed to invite juror",
        variant: "destructive"
      });
    }
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
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Juror
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Juror</DialogTitle>
                  <DialogDescription>
                    Add a new member to the evaluation panel
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={inviteForm.job_title}
                      onChange={(e) => setInviteForm({ ...inviteForm, job_title: e.target.value })}
                      placeholder="Enter job title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={inviteForm.company}
                      onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteJuror}>
                    Invite Juror
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search jurors by name, email, company, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJurors.map((juror) => (
                  <TableRow key={juror.id} className="cursor-pointer hover:bg-muted/50">
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
    </div>
  );
}