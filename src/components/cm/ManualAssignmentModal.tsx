import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface PitchRequest {
  id: string;
  event_title: string | null;
  pitch_date: string | null;
  attendee_emails: string[] | null;
  assignment_status: string | null;
}

interface Startup {
  id: string;
  name: string;
  contact_email: string | null;
}

interface Juror {
  id: string;
  name: string;
  email: string;
  user_id: string;
}

interface ManualAssignmentModalProps {
  pitchRequest: PitchRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ManualAssignmentModal = ({ 
  pitchRequest, 
  isOpen, 
  onClose, 
  onSuccess 
}: ManualAssignmentModalProps) => {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [selectedStartupId, setSelectedStartupId] = useState<string>("");
  const [selectedJurorId, setSelectedJurorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pitchRequest) {
      fetchData();
      // Reset selections when modal opens
      setSelectedStartupId("");
      setSelectedJurorId("");
    }
  }, [isOpen, pitchRequest]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [startupsResult, jurorsResult] = await Promise.all([
        supabase.from('startups').select('id, name, contact_email').order('name'),
        supabase.from('jurors').select('id, name, email, user_id').order('name')
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

  const handleAssign = async () => {
    if (!pitchRequest || !selectedStartupId || !selectedJurorId) {
      toast.error('Please select both a startup and a juror');
      return;
    }

    setLoading(true);
    try {
      const selectedJuror = jurors.find(j => j.id === selectedJurorId);
      if (!selectedJuror) {
        throw new Error('Selected juror not found');
      }

      const { error } = await supabase
        .from('pitch_requests')
        .update({
          startup_id: selectedStartupId,
          vc_id: selectedJuror.user_id,
          assignment_status: 'assigned'
        })
        .eq('id', pitchRequest.id);

      if (error) throw error;

      toast.success('Calendar event assigned successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error assigning calendar event:', error);
      toast.error('Failed to assign calendar event');
    } finally {
      setLoading(false);
    }
  };

  if (!pitchRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Calendar Event</DialogTitle>
          <DialogDescription>
            Manually assign this calendar event to a startup and juror
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Event Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <div>{pitchRequest.event_title || 'Untitled Event'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date & Time</Label>
                <div>
                  {pitchRequest.pitch_date 
                    ? format(new Date(pitchRequest.pitch_date), 'MMM dd, yyyy h:mm a')
                    : 'No date set'
                  }
                </div>
              </div>
            </div>
            
            {pitchRequest.attendee_emails && pitchRequest.attendee_emails.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Attendees</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pitchRequest.attendee_emails.map((email, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assignment Form */}
          {dataLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading startups and jurors...</p>
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
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={loading || !selectedStartupId || !selectedJurorId || dataLoading}
            >
              {loading ? 'Assigning...' : 'Assign Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAssignmentModal;