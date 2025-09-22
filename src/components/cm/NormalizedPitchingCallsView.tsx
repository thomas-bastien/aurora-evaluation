import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, RefreshCw, Plus, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useMeetingsData } from "@/hooks/useMeetingsData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MeetingSection } from "./meeting-sections/MeetingSection";
import { UnmatchedMeetingsTable } from "./meeting-sections/UnmatchedMeetingsTable";
import { MeetingTable } from "./meeting-sections/MeetingTable";
import MeetingManagementModal from "./MeetingManagementModal";
import NewAssignmentModal from "./NewAssignmentModal";

const NormalizedPitchingCallsView = () => {
  const {
    meetings,
    loading,
    needsAssignmentMeetings,
    pendingMeetings,
    scheduledMeetings,
    completedMeetings,
    refetch,
    updateMeetingStatus,
    createAssignment
  } = useMeetingsData();

  const [allStartups, setAllStartups] = useState<any[]>([]);
  const [allJurors, setAllJurors] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [newAssignmentModalOpen, setNewAssignmentModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Section collapse state
  const [sectionCollapseState, setSectionCollapseState] = useState(() => {
    try {
      const saved = localStorage.getItem('normalized-pitching-calls-collapse-state');
      return saved ? JSON.parse(saved) : {
        needsAssignment: false,  // Always expanded for urgent items
        pending: false,          // Expanded by default
        scheduled: true,         // Collapsed by default
        completed: true          // Collapsed by default
      };
    } catch {
      return {
        needsAssignment: false,
        pending: false,
        scheduled: true,
        completed: true
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('normalized-pitching-calls-collapse-state', JSON.stringify(sectionCollapseState));
  }, [sectionCollapseState]);

  const toggleSection = (sectionKey: string) => {
    setSectionCollapseState(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const expandAll = () => {
    setSectionCollapseState({
      needsAssignment: false,
      pending: false,
      scheduled: false,
      completed: false
    });
  };

  const collapseAll = () => {
    setSectionCollapseState({
      needsAssignment: true,
      pending: true,
      scheduled: true,
      completed: true
    });
  };

  const fetchStartupsAndJurors = async () => {
    try {
      const [startupsResponse, jurorsResponse] = await Promise.all([
        supabase.from('startups').select('id, name, contact_email').order('name'),
        supabase.from('jurors').select('id, name, email').order('name')
      ]);

      if (startupsResponse.error) throw startupsResponse.error;
      if (jurorsResponse.error) throw jurorsResponse.error;

      setAllStartups(startupsResponse.data || []);
      setAllJurors(jurorsResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching startups and jurors:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), fetchStartupsAndJurors()]);
    setRefreshing(false);
  };

  const handleManualMatch = async (meetingId: string, startupId: string, jurorId: string) => {
    try {
      // Update the calendar invitation with the assignment
      const { error } = await supabase
        .from('cm_calendar_invitations')
        .update({
          startup_id: startupId,
          juror_id: jurorId,
          matching_status: 'manual_matched',
          manual_assignment_needed: false,
          status: 'scheduled'
        })
        .eq('id', meetingId);

      if (error) throw error;

      // Create the pitching assignment
      await createAssignment(startupId, jurorId);
      
      toast.success('Meeting manually matched successfully');
    } catch (error: any) {
      console.error('Error manually matching meeting:', error);
      toast.error('Failed to manually match meeting');
    }
  };

  const handleScheduleMeeting = (meeting: any) => {
    setSelectedMeeting(meeting);
    setMeetingModalOpen(true);
  };

  const handleEditMeeting = (meeting: any) => {
    setSelectedMeeting(meeting);
    setMeetingModalOpen(true);
  };

  const handleCompleteMeeting = async (meeting: any) => {
    await updateMeetingStatus(meeting.id, 'completed', meeting.source_type);
  };

  const handleCancelMeeting = async (meeting: any) => {
    await updateMeetingStatus(meeting.id, 'cancelled', meeting.source_type);
  };

  const handleMeetingUpdate = () => {
    refetch();
    setMeetingModalOpen(false);
    setSelectedMeeting(null);
  };

  const handleNewAssignment = () => {
    refetch();
    setNewAssignmentModalOpen(false);
  };

  useEffect(() => {
    fetchStartupsAndJurors();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Pitching Calls</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pitching Calls</h2>
          <p className="text-muted-foreground">
            Manage juror-startup meetings with a simplified workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={expandAll}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Expand All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={collapseAll}
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            Collapse All
          </Button>
          <Button 
            onClick={() => setNewAssignmentModalOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={needsAssignmentMeetings.length > 0 ? "border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Assignment</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{needsAssignmentMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Require manual matching</p>
          </CardContent>
        </Card>

        <Card className={pendingMeetings.length > 0 ? "border-orange-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Need scheduling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Ready to proceed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Finished meetings</p>
          </CardContent>
        </Card>
      </div>

      {/* Needs Assignment Section */}
      {needsAssignmentMeetings.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Needs Assignment ({needsAssignmentMeetings.length} items)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Calendar meetings that require manual startup-juror matching
            </p>
          </CardHeader>
          <CardContent>
            <UnmatchedMeetingsTable
              meetings={needsAssignmentMeetings}
              allStartups={allStartups}
              allJurors={allJurors}
              onMatch={handleManualMatch}
            />
          </CardContent>
        </Card>
      )}

      {/* Pending Section */}
      <MeetingSection
        title="Pending"
        description="Assigned meetings that haven't been scheduled yet"
        count={pendingMeetings.length}
        isOpen={!sectionCollapseState.pending}
        onToggle={() => toggleSection('pending')}
        variant="warning"
      >
        <MeetingTable
          meetings={pendingMeetings}
          onSchedule={handleScheduleMeeting}
          onCancel={handleCancelMeeting}
          emptyMessage="No pending meetings"
        />
      </MeetingSection>

      {/* Scheduled Section */}
      <MeetingSection
        title="Scheduled"
        description="Confirmed meetings with scheduled dates"
        count={scheduledMeetings.length}
        isOpen={!sectionCollapseState.scheduled}
        onToggle={() => toggleSection('scheduled')}
      >
        <MeetingTable
          meetings={scheduledMeetings}
          onEdit={handleEditMeeting}
          onComplete={handleCompleteMeeting}
          onCancel={handleCancelMeeting}
          emptyMessage="No scheduled meetings"
        />
      </MeetingSection>

      {/* Completed Section */}
      <MeetingSection
        title="Completed"
        description="Finished meetings"
        count={completedMeetings.length}
        isOpen={!sectionCollapseState.completed}
        onToggle={() => toggleSection('completed')}
        variant="success"
      >
        <MeetingTable
          meetings={completedMeetings}
          showActions={false}
          emptyMessage="No completed meetings"
        />
      </MeetingSection>

      {/* Modals */}
      <MeetingManagementModal
        meeting={selectedMeeting}
        isOpen={meetingModalOpen}
        onClose={() => {
          setMeetingModalOpen(false);
          setSelectedMeeting(null);
        }}
        onSuccess={handleMeetingUpdate}
      />

      <NewAssignmentModal
        isOpen={newAssignmentModalOpen}
        onClose={() => setNewAssignmentModalOpen(false)}
        onSuccess={handleNewAssignment}
      />
    </div>
  );
};

export default NormalizedPitchingCallsView;