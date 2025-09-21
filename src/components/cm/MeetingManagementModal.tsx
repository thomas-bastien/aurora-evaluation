import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PitchingAssignment {
  id: string;
  startup_id: string;
  juror_id: string;
  status: string;
  meeting_scheduled_date: string | null;
  meeting_completed_date: string | null;
  meeting_notes: string | null;
  calendly_link: string | null;
  startup: {
    name: string;
    contact_email: string;
  };
  juror: {
    name: string;
    email: string;
  };
}

interface MeetingManagementModalProps {
  assignment: PitchingAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MeetingManagementModal = ({ 
  assignment, 
  isOpen, 
  onClose, 
  onSuccess 
}: MeetingManagementModalProps) => {
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [calendlyLink, setCalendlyLink] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assignment && isOpen) {
      // Initialize form with existing data
      if (assignment.meeting_scheduled_date) {
        const date = new Date(assignment.meeting_scheduled_date);
        setScheduledDate(date);
        setScheduledTime(format(date, 'HH:mm'));
      } else {
        setScheduledDate(undefined);
        setScheduledTime("");
      }
      
      setMeetingNotes(assignment.meeting_notes || "");
      setCalendlyLink(assignment.calendly_link || "");
    }
  }, [assignment, isOpen]);

  const handleSave = async () => {
    if (!assignment) return;

    setLoading(true);
    try {
      let meeting_scheduled_date = null;
      
      if (scheduledDate && scheduledTime) {
        const [hours, minutes] = scheduledTime.split(':');
        const dateTime = new Date(scheduledDate);
        dateTime.setHours(parseInt(hours), parseInt(minutes));
        meeting_scheduled_date = dateTime.toISOString();
      }

      const updates: any = {
        meeting_notes: meetingNotes || null,
        calendly_link: calendlyLink || null,
      };

      // Only update scheduled date if it's provided
      if (meeting_scheduled_date) {
        updates.meeting_scheduled_date = meeting_scheduled_date;
        updates.status = 'scheduled';
      }

      const { error } = await supabase
        .from('pitching_assignments')
        .update(updates)
        .eq('id', assignment.id);

      if (error) throw error;

      toast.success('Meeting details updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating meeting details:', error);
      toast.error('Failed to update meeting details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!assignment) return null;
    
    if (assignment.meeting_completed_date) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    }
    if (assignment.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (assignment.meeting_scheduled_date) {
      return <Badge variant="secondary">Scheduled</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Meeting</DialogTitle>
          <DialogDescription>
            Update meeting details for this juror-startup assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Assignment Details</h4>
              {getStatusBadge()}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Startup</Label>
                <div className="font-medium">{assignment.startup.name}</div>
                <div className="text-xs text-muted-foreground">{assignment.startup.contact_email}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Juror</Label>
                <div className="font-medium">{assignment.juror.name}</div>
                <div className="text-xs text-muted-foreground">{assignment.juror.email}</div>
              </div>
            </div>
          </div>

          {/* Meeting Scheduling */}
          <div className="space-y-4">
            <h4 className="font-medium">Meeting Schedule</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meeting Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting-time">Meeting Time</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="calendly-link">Meeting Link (Optional)</Label>
            <Input
              id="calendly-link"
              type="url"
              placeholder="https://calendly.com/..."
              value={calendlyLink}
              onChange={(e) => setCalendlyLink(e.target.value)}
            />
          </div>

          {/* Meeting Notes */}
          <div className="space-y-2">
            <Label htmlFor="meeting-notes">Meeting Notes</Label>
            <Textarea
              id="meeting-notes"
              placeholder="Add notes about the meeting (before or after)..."
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              You can add notes before scheduling to provide context, or after the meeting to record outcomes.
            </p>
          </div>

          {/* Existing Meeting Info */}
          {assignment.meeting_scheduled_date && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Current Schedule</h5>
              <p className="text-sm text-blue-800">
                Scheduled for {format(new Date(assignment.meeting_scheduled_date), 'PPPP')} at {format(new Date(assignment.meeting_scheduled_date), 'p')}
              </p>
            </div>
          )}

          {assignment.meeting_completed_date && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h5 className="font-medium text-green-900 mb-2">Meeting Completed</h5>
              <p className="text-sm text-green-800">
                Completed on {format(new Date(assignment.meeting_completed_date), 'PPPP')} at {format(new Date(assignment.meeting_completed_date), 'p')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingManagementModal;
