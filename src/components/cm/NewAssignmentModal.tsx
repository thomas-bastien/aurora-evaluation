import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Startup {
  id: string;
  name: string;
  contact_email: string | null;
}

interface Juror {
  id: string;
  name: string;
  email: string;
}

interface NewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewAssignmentModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}: NewAssignmentModalProps) => {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [selectedStartupId, setSelectedStartupId] = useState<string>("");
  const [selectedJurorId, setSelectedJurorId] = useState<string>("");
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset selections when modal opens
      setSelectedStartupId("");
      setSelectedJurorId("");
      setSendEmail(true);
    }
  }, [isOpen]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [startupsResult, jurorsResult] = await Promise.all([
        supabase.from('startups').select('id, name, contact_email').order('name'),
        supabase.from('jurors').select('id, name, email').order('name')
      ]);

      if (startupsResult.error) throw startupsResult.error;
      if (jurorsResult.error) throw jurorsResult.error;

      setStartups(startupsResult.data || []);
      setJurors(jurorsResult.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load startups and jurors');
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedStartupId || !selectedJurorId) {
      toast.error('Please select both a startup and a juror');
      return;
    }

    setLoading(true);
    try {
      // Check if active assignment already exists (ignore cancelled ones)
      const { data: existingAssignment } = await supabase
        .from('pitching_assignments')
        .select('id')
        .eq('startup_id', selectedStartupId)
        .eq('juror_id', selectedJurorId)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (existingAssignment) {
        toast.error('An active assignment already exists for this startup-juror pair');
        return;
      }

      const { error } = await supabase
        .from('pitching_assignments')
        .insert({
          startup_id: selectedStartupId,
          juror_id: selectedJurorId,
          status: 'assigned'
        });

      if (error) throw error;

      // Send scheduling email if checkbox is checked
      if (sendEmail) {
        try {
          const selectedStartup = startups.find(s => s.id === selectedStartupId);
          const selectedJuror = jurors.find(j => j.id === selectedJurorId);

          if (selectedStartup && selectedJuror) {
            const { error: emailError } = await supabase.functions.invoke('send-pitch-scheduling', {
              body: {
                startupId: selectedStartupId,
                startupName: selectedStartup.name,
                startupEmail: selectedStartup.contact_email,
                assignedJurors: [{
                  id: selectedJuror.id,
                  name: selectedJuror.name,
                  email: selectedJuror.email,
                  company: 'N/A', // Company field not available in jurors table
                  calendlyLink: '' // Will be populated if available
                }]
              }
            });

            if (emailError) {
              console.error('Error sending scheduling email:', emailError);
              toast.error('Assignment created but failed to send scheduling email');
            } else {
              toast.success('Assignment created and scheduling email sent');
            }
          }
        } catch (emailError) {
          console.error('Error sending scheduling email:', emailError);
          toast.error('Assignment created but failed to send scheduling email');
        }
      } else {
        toast.success('Assignment created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Assign a juror to evaluate a startup in the pitching round
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Form */}
          {dataLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startup-select">Select Startup</Label>
                <Select value={selectedStartupId} onValueChange={setSelectedStartupId}>
                  <SelectTrigger id="startup-select">
                    <SelectValue placeholder="Choose a startup..." />
                  </SelectTrigger>
                  <SelectContent>
                    {startups.map((startup) => (
                      <SelectItem key={startup.id} value={startup.id}>
                        <div>
                          <div className="font-medium">{startup.name}</div>
                          {startup.contact_email && (
                            <div className="text-xs text-muted-foreground">
                              {startup.contact_email}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {startups.length} startups available
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="juror-select">Select Juror</Label>
                <Select value={selectedJurorId} onValueChange={setSelectedJurorId}>
                  <SelectTrigger id="juror-select">
                    <SelectValue placeholder="Choose a juror..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jurors.map((juror) => (
                      <SelectItem key={juror.id} value={juror.id}>
                        <div>
                          <div className="font-medium">{juror.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {juror.email}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {jurors.length} jurors available
                </p>
              </div>
            </div>
          )}

          {/* Preview Selected Assignment */}
          {selectedStartupId && selectedJurorId && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Assignment Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Startup</Label>
                  <div className="font-medium">
                    {startups.find(s => s.id === selectedStartupId)?.name}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Juror</Label>
                  <div className="font-medium">
                    {jurors.find(j => j.id === selectedJurorId)?.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Option */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="send-email" 
              checked={sendEmail} 
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
            />
            <Label htmlFor="send-email" className="text-sm">
              Send scheduling email to startup and juror
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAssignment} 
              disabled={loading || !selectedStartupId || !selectedJurorId || dataLoading}
            >
              {loading ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAssignmentModal;