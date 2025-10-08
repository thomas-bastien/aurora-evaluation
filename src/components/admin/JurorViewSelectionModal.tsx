import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useViewMode } from '@/contexts/ViewModeContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Juror {
  id: string;
  name: string;
  email: string;
  company: string | null;
  screeningAssignments: number;
  pitchingAssignments: number;
}

interface JurorViewSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JurorViewSelectionModal = ({ open, onOpenChange }: JurorViewSelectionModalProps) => {
  const { switchToJurorView } = useViewMode();
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [filteredJurors, setFilteredJurors] = useState<Juror[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchJurors();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = jurors.filter(
        (juror) =>
          juror.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          juror.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (juror.company && juror.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredJurors(filtered);
    } else {
      setFilteredJurors(jurors);
    }
  }, [searchTerm, jurors]);

  const fetchJurors = async () => {
    try {
      setLoading(true);

      // Fetch all jurors
      const { data: jurorsData, error: jurorsError } = await supabase
        .from('jurors')
        .select('id, name, email, company')
        .order('name');

      if (jurorsError) throw jurorsError;

      // Fetch assignment counts for each juror
      const jurorsWithCounts = await Promise.all(
        (jurorsData || []).map(async (juror) => {
          const [screeningResult, pitchingResult] = await Promise.all([
            supabase
              .from('screening_assignments')
              .select('id', { count: 'exact', head: true })
              .eq('juror_id', juror.id)
              .eq('status', 'assigned'),
            supabase
              .from('pitching_assignments')
              .select('id', { count: 'exact', head: true })
              .eq('juror_id', juror.id)
              .eq('status', 'assigned'),
          ]);

          return {
            ...juror,
            screeningAssignments: screeningResult.count || 0,
            pitchingAssignments: pitchingResult.count || 0,
          };
        })
      );

      setJurors(jurorsWithCounts);
      setFilteredJurors(jurorsWithCounts);
    } catch (error) {
      console.error('Error fetching jurors:', error);
      toast.error('Failed to load jurors');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewAsJuror = (juror: Juror) => {
    switchToJurorView(juror.id, juror.name);
    toast.success(`Now previewing as ${juror.name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Select Juror to Preview
          </DialogTitle>
          <DialogDescription>
            Choose a juror to view their assigned startups and evaluations (read-only mode)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredJurors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No jurors found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-center">Screening</TableHead>
                    <TableHead className="text-center">Pitching</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJurors.map((juror) => (
                    <TableRow key={juror.id}>
                      <TableCell className="font-medium">{juror.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {juror.email}
                      </TableCell>
                      <TableCell className="text-sm">{juror.company || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {juror.screeningAssignments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {juror.pitchingAssignments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewAsJuror(juror)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
