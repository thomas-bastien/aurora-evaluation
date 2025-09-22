import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedMeeting, MeetingStatus } from '@/types/meetings';
import { toast } from 'sonner';

export const useMeetingsData = () => {
  const [meetings, setMeetings] = useState<UnifiedMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = async () => {
    try {
      setLoading(true);

      // Fetch pitching assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('pitching_assignments')
        .select(`
          *,
          startup:startups!inner(name, contact_email),
          juror:jurors!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch calendar invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('cm_calendar_invitations')
        .select(`
          *,
          startup:startups(name, contact_email),
          juror:jurors(name, email)
        `)
        .order('event_start_date', { ascending: false });

      if (invitationsError) throw invitationsError;

      // Normalize and combine data
      const normalizedMeetings: UnifiedMeeting[] = [];

      // Process assignments
      assignments?.forEach(assignment => {
        const status = determineAssignmentStatus(assignment);
        normalizedMeetings.push({
          id: assignment.id,
          startup_id: assignment.startup_id,
          juror_id: assignment.juror_id,
          startup_name: assignment.startup.name,
          startup_email: assignment.startup.contact_email,
          juror_name: assignment.juror.name,
          juror_email: assignment.juror.email,
          status,
          scheduled_date: assignment.meeting_scheduled_date,
          completed_date: assignment.meeting_completed_date,
          meeting_notes: assignment.meeting_notes,
          meeting_link: assignment.calendly_link,
          created_at: assignment.created_at,
          source_type: 'assignment',
          source_id: assignment.id
        });
      });

      // Process calendar invitations (only unmatched ones)
      invitations?.forEach(invitation => {
        if (invitation.manual_assignment_needed && !invitation.startup_id && !invitation.juror_id) {
          normalizedMeetings.push({
            id: invitation.id,
            startup_id: '',
            juror_id: '',
            startup_name: 'Unassigned',
            startup_email: '',
            juror_name: 'Unassigned',
            juror_email: '',
            status: 'needs_assignment',
            scheduled_date: invitation.event_start_date,
            completed_date: null,
            meeting_notes: invitation.event_description,
            meeting_link: invitation.event_location,
            created_at: invitation.created_at,
            source_type: 'calendar_invitation',
            source_id: invitation.id,
            event_details: {
              summary: invitation.event_summary,
              description: invitation.event_description,
              location: invitation.event_location
            }
          });
        }
      });

      setMeetings(normalizedMeetings);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to fetch meetings data');
    } finally {
      setLoading(false);
    }
  };

  const updateMeetingStatus = async (meetingId: string, newStatus: MeetingStatus, sourceType: 'assignment' | 'calendar_invitation') => {
    try {
      if (sourceType === 'assignment') {
        const updateData: any = { status: newStatus };
        
        if (newStatus === 'completed') {
          updateData.meeting_completed_date = new Date().toISOString();
        }

        const { error } = await supabase
          .from('pitching_assignments')
          .update(updateData)
          .eq('id', meetingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cm_calendar_invitations')
          .update({ status: newStatus })
          .eq('id', meetingId);

        if (error) throw error;
      }

      toast.success(`Meeting marked as ${newStatus}`);
      await fetchMeetings();
    } catch (error: any) {
      console.error('Error updating meeting status:', error);
      toast.error('Failed to update meeting status');
    }
  };

  const scheduleMeeting = async (meetingId: string, scheduledDate: string, meetingLink?: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('pitching_assignments')
        .update({
          meeting_scheduled_date: scheduledDate,
          calendly_link: meetingLink,
          meeting_notes: notes,
          status: 'scheduled'
        })
        .eq('id', meetingId);

      if (error) throw error;

      toast.success('Meeting scheduled successfully');
      await fetchMeetings();
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast.error('Failed to schedule meeting');
    }
  };

  const createAssignment = async (startupId: string, jurorId: string) => {
    try {
      const { error } = await supabase
        .from('pitching_assignments')
        .insert({
          startup_id: startupId,
          juror_id: jurorId,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Assignment created successfully');
      await fetchMeetings();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Filter meetings by status
  const needsAssignmentMeetings = meetings.filter(m => m.status === 'needs_assignment');
  const pendingMeetings = meetings.filter(m => m.status === 'pending');
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
  const completedMeetings = meetings.filter(m => m.status === 'completed');

  return {
    meetings,
    loading,
    needsAssignmentMeetings,
    pendingMeetings,
    scheduledMeetings,
    completedMeetings,
    refetch: fetchMeetings,
    updateMeetingStatus,
    scheduleMeeting,
    createAssignment
  };
};

// Helper function to determine assignment status
const determineAssignmentStatus = (assignment: any): MeetingStatus => {
  if (assignment.meeting_completed_date || assignment.status === 'completed') {
    return 'completed';
  }
  if (assignment.status === 'cancelled') {
    return 'cancelled';
  }
  if (assignment.meeting_scheduled_date) {
    return 'scheduled';
  }
  return 'pending';
};