import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Sparkles, Info, CheckCircle } from "lucide-react";
import { UnifiedMeeting, AIMatchSuggestion } from "@/types/meetings";
import ManualMatchingDropdowns from "../ManualMatchingDropdowns";

interface UnmatchedMeetingsTableProps {
  meetings: UnifiedMeeting[];
  allStartups: any[];
  allJurors: any[];
  onMatch: (meetingId: string, startupId: string, jurorId: string) => void;
}

// AI Suggestion Badge Component
const AISuggestionBadge = ({ suggestion }: { suggestion: AIMatchSuggestion }) => {
  const confidenceColor = 
    suggestion.combined_confidence >= 85 ? 'bg-green-100 text-green-800 border-green-300' :
    suggestion.combined_confidence >= 70 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
    'bg-orange-100 text-orange-800 border-orange-300';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${confidenceColor} cursor-help`}>
            <Sparkles className="w-3 h-3" />
            Gemini AI: {suggestion.combined_confidence}%
            <Info className="w-3 h-3 ml-1" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2 text-xs">
            <div className="font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by Google Gemini 2.5 Flash
            </div>
            <div>
              <strong>Startup:</strong> {suggestion.startup_name} ({suggestion.startup_confidence}%)
              <div className="text-muted-foreground mt-1 italic">{suggestion.startup_reasoning}</div>
            </div>
            <div>
              <strong>Juror:</strong> {suggestion.juror_name} ({suggestion.juror_confidence}%)
              <div className="text-muted-foreground mt-1 italic">{suggestion.juror_reasoning}</div>
            </div>
            <div className="pt-1 border-t">
              <strong>Method:</strong> {suggestion.match_method}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

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
              {meeting.ai_suggested_matches && meeting.ai_suggested_matches.length > 0 ? (
                <div className="space-y-2">
                  <AISuggestionBadge suggestion={meeting.ai_suggested_matches[0]} />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      onClick={() => {
                        const topSuggestion = meeting.ai_suggested_matches![0];
                        onMatch(meeting.source_id, topSuggestion.startup_id, topSuggestion.juror_id);
                      }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Accept AI Match
                    </Button>
                    <ManualMatchingDropdowns
                      invitationId={meeting.source_id}
                      allStartups={allStartups}
                      allJurors={allJurors}
                      onMatch={onMatch}
                    />
                  </div>
                  {meeting.ai_suggested_matches.length > 1 && (
                    <details className="text-xs text-muted-foreground mt-2">
                      <summary className="cursor-pointer hover:underline font-medium">
                        View {meeting.ai_suggested_matches.length - 1} alternative AI suggestions
                      </summary>
                      <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-200">
                        {meeting.ai_suggested_matches.slice(1).map((alt, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="font-medium">{alt.startup_name} + {alt.juror_name}</div>
                              <div className="text-xs text-gray-600">
                                Confidence: {alt.combined_confidence}% · {alt.match_method}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onMatch(meeting.source_id, alt.startup_id, alt.juror_id)}
                            >
                              Use
                            </Button>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <ManualMatchingDropdowns
                  invitationId={meeting.source_id}
                  allStartups={allStartups}
                  allJurors={allJurors}
                  onMatch={onMatch}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};