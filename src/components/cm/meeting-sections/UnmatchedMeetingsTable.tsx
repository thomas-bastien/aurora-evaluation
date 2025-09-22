import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { UnifiedMeeting } from "@/types/meetings";
import ManualMatchingDropdowns from "../ManualMatchingDropdowns";

interface UnmatchedMeetingsTableProps {
  meetings: UnifiedMeeting[];
  allStartups: any[];
  allJurors: any[];
  onMatch: (meetingId: string, startupId: string, jurorId: string) => void;
}

export const UnmatchedMeetingsTable = ({
  meetings,
  allStartups,
  allJurors,
  onMatch
}: UnmatchedMeetingsTableProps) => {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No unmatched meetings found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event Details</TableHead>
          <TableHead>Meeting Link</TableHead>
          <TableHead>Scheduled Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assign To</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => (
          <TableRow key={meeting.id}>
            <TableCell>
              <div>
                <div className="font-medium">
                  {meeting.event_details?.summary || 'Pitch Meeting'}
                </div>
                {meeting.event_details?.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {meeting.event_details.description}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              {meeting.meeting_link ? (
                <div className="text-sm">
                  📍 {meeting.meeting_link}
                </div>
              ) : (
                <span className="text-muted-foreground">No link</span>
              )}
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
                <span className="text-muted-foreground">No date</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                Needs Assignment
              </Badge>
            </TableCell>
            <TableCell>
              <ManualMatchingDropdowns
                invitationId={meeting.source_id}
                allStartups={allStartups}
                allJurors={allJurors}
                onMatch={onMatch}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};