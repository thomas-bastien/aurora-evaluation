import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Check, XCircle, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import { UnifiedMeeting, getMeetingStatusConfig } from "@/types/meetings";

interface MeetingTableProps {
  meetings: UnifiedMeeting[];
  onSchedule?: (meeting: UnifiedMeeting) => void;
  onEdit?: (meeting: UnifiedMeeting) => void;
  onComplete?: (meeting: UnifiedMeeting) => void;
  onCancel?: (meeting: UnifiedMeeting) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export const MeetingTable = ({
  meetings,
  onSchedule,
  onEdit,
  onComplete,
  onCancel,
  showActions = true,
  emptyMessage = "No meetings found"
}: MeetingTableProps) => {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Startup</TableHead>
          <TableHead>Juror</TableHead>
          <TableHead>Scheduled Date</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => (
          <TableRow key={meeting.id}>
            <TableCell>
              <div>
                <div className="font-medium">{meeting.startup_name}</div>
                <div className="text-sm text-muted-foreground">
                  {meeting.startup_email}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{meeting.juror_name}</div>
                <div className="text-sm text-muted-foreground">
                  {meeting.juror_email}
                </div>
              </div>
            </TableCell>
            <TableCell>
              {meeting.scheduled_date ? (
                <div>
                  <div className="font-medium">
                    {format(new Date(meeting.scheduled_date), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(meeting.scheduled_date), 'h:mm a')}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">Not scheduled</span>
              )}
            </TableCell>
            <TableCell>
              <Badge 
                variant={getMeetingStatusConfig(meeting.status).variant}
                className={getMeetingStatusConfig(meeting.status).className}
              >
                {getMeetingStatusConfig(meeting.status).label}
              </Badge>
            </TableCell>
            {showActions && (
              <TableCell>
                <div className="flex gap-1">
                  {meeting.status === 'pending' && onSchedule && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSchedule(meeting)}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Schedule
                    </Button>
                  )}
                  {meeting.status === 'scheduled' && (
                    <>
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(meeting)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {onComplete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onComplete(meeting)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      )}
                    </>
                  )}
                  {(meeting.status === 'pending' || meeting.status === 'scheduled') && onCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCancel(meeting)}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};