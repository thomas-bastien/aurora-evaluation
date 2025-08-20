import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, Users, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StartupAssignmentModal } from "@/components/matchmaking/StartupAssignmentModal";
import { AssignmentSummary } from "@/components/matchmaking/AssignmentSummary";
interface Startup {
  id: string;
  name: string;
  industry: string;
  stage: string;
  description: string;
  location: string;
  founder_names: string[];
}
interface Juror {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
}
interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}
const Matchmaking = () => {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all startups (remove status filter to see actual count)
      const {
        data: startupsData,
        error: startupsError
      } = await supabase.from('startups').select('*').order('name');
      if (startupsError) throw startupsError;

      // Fetch all jurors
      const {
        data: jurorsData,
        error: jurorsError
      } = await supabase.from('jurors').select('*').order('name');
      if (jurorsError) throw jurorsError;

      // Fetch existing assignments
      const {
        data: assignmentsData,
        error: assignmentsError
      } = await supabase.from('startup_assignments').select(`
          startup_id,
          juror_id,
          startups(name),
          jurors(name)
        `);
      if (assignmentsError) throw assignmentsError;
      setStartups(startupsData || []);
      setJurors(jurorsData || []);

      // Transform assignments data
      const transformedAssignments = assignmentsData?.map(assignment => ({
        startup_id: assignment.startup_id,
        juror_id: assignment.juror_id,
        startup_name: (assignment.startups as any)?.name || '',
        juror_name: (assignment.jurors as any)?.name || ''
      })) || [];
      setAssignments(transformedAssignments);

      // Check if assignments are confirmed (simplified check)
      setIsConfirmed(transformedAssignments.length > 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const canAccessMatchmaking = () => {
    return true; // Always allow access for testing
  };
  const hasCompleteData = () => {
    return startups.length > 0 && jurors.length > 0;
  };
  const getIncompleteDataWarning = () => {
    const missingItems = [];
    if (startups.length === 0) missingItems.push('startups');
    if (jurors.length === 0) missingItems.push('jurors');
    return missingItems.length > 0 ? `Missing: ${missingItems.join(', ')}` : null;
  };
  const getStartupAssignmentCount = (startupId: string) => {
    return assignments.filter(a => a.startup_id === startupId).length;
  };
  const handleAssignStartup = (startup: Startup) => {
    setSelectedStartup(startup);
    setShowAssignmentModal(true);
  };
  const handleAssignmentComplete = (newAssignments: Assignment[]) => {
    setAssignments(prev => {
      // Remove existing assignments for this startup
      const filtered = prev.filter(a => a.startup_id !== selectedStartup?.id);
      // Add new assignments
      return [...filtered, ...newAssignments];
    });
    setShowAssignmentModal(false);
    setSelectedStartup(null);
    toast({
      title: "Success",
      description: "Jurors assigned successfully."
    });
  };
  const handleConfirmAssignments = async () => {
    try {
      // Delete existing assignments
      await supabase.from('startup_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      // Insert new assignments with appropriate status
      const assignmentRecords = assignments.map(assignment => ({
        startup_id: assignment.startup_id,
        juror_id: assignment.juror_id,
        status: hasCompleteData() ? 'confirmed' : 'draft'
      }));
      const {
        error
      } = await supabase.from('startup_assignments').insert(assignmentRecords);
      if (error) throw error;
      setIsConfirmed(true);
      const statusMessage = hasCompleteData() ? "All assignments have been confirmed successfully." : "Assignments have been saved as drafts. You can finalize them once all data is uploaded.";
      toast({
        title: "Success",
        description: statusMessage
      });
    } catch (error) {
      console.error('Error confirming assignments:', error);
      toast({
        title: "Error",
        description: "Failed to confirm assignments. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleViewSummary = () => {
    setShowSummary(true);
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-muted-foreground">Loading...</div>
          </div>
        </main>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Matchmaking</h1>
              <p className="text-lg text-muted-foreground">
                Assign jurors to startups for evaluation
              </p>
            </div>
            <div className="flex gap-4">
              {assignments.length > 0 && <Button variant="outline" onClick={handleViewSummary}>
                  View Summary
                </Button>}
              {assignments.length > 0 && !isConfirmed && <Button onClick={handleConfirmAssignments}>
                  Confirm All Assignments
                </Button>}
            </div>
          </div>
        </div>

        {/* Info Banner for Missing Data */}
        {(startups.length === 0 || jurors.length === 0) && <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-warning" />
                <div>
                  <h3 className="font-semibold text-warning">⚠️ Some startups or jurors have not been uploaded yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can still assign, but assignments may be incomplete.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Startups</p>
                   <p className="text-2xl font-bold text-foreground">{startups.length}</p>
                 </div>
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Jurors</p>
                   <p className="text-2xl font-bold text-foreground">{jurors.length}</p>
                 </div>
                <Users className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assignment Status</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isConfirmed ? hasCompleteData() ? "Confirmed" : "Draft" : "Not Saved"}
                  </p>
                </div>
                {isConfirmed ? <CheckCircle2 className="w-8 h-8 text-success" /> : <AlertCircle className="w-8 h-8 text-warning" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Startups List */}
        <Card>
          <CardHeader>
            <CardTitle>Startups</CardTitle>
            <CardDescription>
              Click on a startup to assign jurors. Each startup needs at least 3 jurors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {startups.map(startup => {
              const assignmentCount = getStartupAssignmentCount(startup.id);
              const hasMinimumJurors = assignmentCount >= 3;
              return <div key={startup.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">{startup.name}</h3>
                          <Badge variant="outline">{startup.industry}</Badge>
                          <Badge variant="outline">{startup.stage}</Badge>
                          {hasMinimumJurors ? <Badge variant="default">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {assignmentCount} jurors
                            </Badge> : <Badge variant="destructive">
                              {assignmentCount}/3 jurors
                            </Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {startup.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{startup.location}</span>
                          {startup.founder_names && startup.founder_names.length > 0 && <span>Founders: {startup.founder_names.join(", ")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleAssignStartup(startup)}>
                          {assignmentCount > 0 ? "Edit Assignment" : "Assign Jurors"}
                        </Button>
                      </div>
                    </div>
                  </div>;
            })}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Modal */}
        {selectedStartup && <StartupAssignmentModal startup={selectedStartup} jurors={jurors} existingAssignments={assignments.filter(a => a.startup_id === selectedStartup.id)} open={showAssignmentModal} onOpenChange={setShowAssignmentModal} onComplete={handleAssignmentComplete} />}

        {/* Assignment Summary Modal */}
        <AssignmentSummary assignments={assignments} startups={startups} jurors={jurors} open={showSummary} onOpenChange={setShowSummary} isConfirmed={isConfirmed} />
      </main>
    </div>;
};
export default Matchmaking;