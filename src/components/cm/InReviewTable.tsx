import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Calendar, MapPin, FileText, Users, Sparkles } from "lucide-react";
import { UnifiedMeeting } from "@/types/meetings";
import { format } from "date-fns";

interface InReviewTableProps {
  meetings: UnifiedMeeting[];
  onApprove: (meetingId: string, sourceType: 'assignment' | 'calendar_invitation') => Promise<void>;
  onReject: (meetingId: string, sourceType: 'assignment' | 'calendar_invitation') => Promise<void>;
}

export const InReviewTable = ({ meetings, onApprove, onReject }: InReviewTableProps) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAction = async (meetingId: string, sourceType: 'assignment' | 'calendar_invitation', action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set([...prev, meetingId]));
    try {
      if (action === 'approve') {
        await onApprove(meetingId, sourceType);
      } else {
        await onReject(meetingId, sourceType);
      }
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(meetingId);
        return newSet;
      });
    }
  };

  if (meetings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No meetings in review
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <Card key={meeting.id} className="border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                {meeting.startup_name} ↔ {meeting.juror_name}
              </CardTitle>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                  Awaiting CM Review
                </Badge>
                {meeting.ai_match_confidence && meeting.ai_match_confidence >= 70 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Gemini AI: {meeting.ai_match_confidence}%
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meeting Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Scheduled:</span>
                  <span>
                    {meeting.scheduled_date ? format(new Date(meeting.scheduled_date), "PPp") : "Not set"}
                  </span>
                </div>
                {meeting.meeting_link && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <a 
                      href={meeting.meeting_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate max-w-[200px]"
                    >
                      {meeting.meeting_link}
                    </a>
                  </div>
                )}
                {meeting.meeting_notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="font-medium">Notes:</span>
                    <span className="text-muted-foreground text-xs leading-relaxed">
                      {meeting.meeting_notes}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Startup:</span>
                  <div className="text-muted-foreground">
                    {meeting.startup_email && (
                      <a href={`mailto:${meeting.startup_email}`} className="text-blue-600 hover:underline">
                        {meeting.startup_email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Juror:</span>
                  <div className="text-muted-foreground">
                    {meeting.juror_email && (
                      <a href={`mailto:${meeting.juror_email}`} className="text-blue-600 hover:underline">
                        {meeting.juror_email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Details from Calendar Invite */}
            {meeting.event_details && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Calendar Event Details:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {meeting.event_details.summary && (
                    <div><span className="font-medium">Subject:</span> {meeting.event_details.summary}</div>
                  )}
                  {meeting.event_details.description && (
                    <div><span className="font-medium">Description:</span> {meeting.event_details.description}</div>
                  )}
                  {meeting.event_details.location && (
                    <div><span className="font-medium">Location:</span> {meeting.event_details.location}</div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                onClick={() => handleAction(meeting.id, meeting.source_type, 'approve')}
                disabled={processingIds.has(meeting.id)}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Approve & Schedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(meeting.id, meeting.source_type, 'reject')}
                disabled={processingIds.has(meeting.id)}
                className="flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" />
                Return to Pending
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};