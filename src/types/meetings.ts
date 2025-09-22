// Unified meeting data types and utilities

export interface UnifiedMeeting {
  id: string;
  startup_id: string;
  juror_id: string;
  startup_name: string;
  startup_email: string;
  juror_name: string;
  juror_email: string;
  status: MeetingStatus;
  scheduled_date: string | null;
  completed_date: string | null;
  meeting_notes: string | null;
  meeting_link: string | null;
  created_at: string;
  source_type: 'assignment' | 'calendar_invitation';
  source_id: string;
  event_details?: {
    summary?: string;
    description?: string;
    location?: string;
  };
}

export type MeetingStatus = 
  | 'needs_assignment'  // Unmatched calendar events
  | 'pending'           // Assigned but not scheduled
  | 'scheduled'         // Confirmed meetings with dates
  | 'completed'         // Finished meetings
  | 'cancelled';        // Cancelled meetings

export interface MeetingStatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}

export const MEETING_STATUS_CONFIG: Record<MeetingStatus, MeetingStatusConfig> = {
  needs_assignment: {
    label: 'Needs Assignment',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-200'
  },
  pending: {
    label: 'Pending',
    variant: 'outline',
    className: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  scheduled: {
    label: 'Scheduled',
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  completed: {
    label: 'Completed',
    variant: 'default',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

export const getMeetingStatusConfig = (status: MeetingStatus): MeetingStatusConfig => {
  return MEETING_STATUS_CONFIG[status];
};