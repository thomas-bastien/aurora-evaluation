import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDashboardCounts } from '@/utils/countsUtils';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UnifiedOverviewCard } from "@/components/dashboard/UnifiedOverviewCard";
import { FunnelStage } from "@/components/dashboard/FunnelStage";
import { ScreeningFunnelView } from "@/components/dashboard/ScreeningFunnelView";
import { PitchingFunnelView } from "@/components/dashboard/PitchingFunnelView";
import { AIGuidanceBox } from "@/components/common/AIGuidanceBox";
import { useAIGuidanceData } from "@/hooks/useAIGuidanceData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCohortSettings } from "@/hooks/useCohortSettings";
import { formatDeadlineDisplay, formatDeadlineSimple, isDeadlinePassed } from "@/utils/deadlineUtils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  Network, 
  Star, 
  MessageSquare, 
  BarChart3, 
  Calendar, 
  Upload,
  Phone,
  CheckCircle,
  TrendingUp,
  FileText
} from "lucide-react";

const Dashboard = () => {
  const { profile, refreshProfile } = useUserProfile();
  const { cohortSettings } = useCohortSettings();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    activeStartups: 0,
    activeJurors: 0,
    totalStartups: 0,
    totalJurors: 0,
    activeRound: 'screening' as 'screening' | 'pitching',
    evaluationProgress: 0,
    deadlineInfo: 'Loading...',
    nextMilestone: 'Loading...',
    screeningProgress: {
      assignments: 0,
      completed: 0,
      percentage: 0
    },
    pitchingProgress: {
      assignments: 0,
      completed: 0,
      percentage: 0
    },
    screeningStats: {
      startupsUploaded: 0,
      jurorsUploaded: 0,
      matchmakingProgress: 0,
      evaluationsProgress: 0,
      selectionComplete: false,
      resultsComplete: false
    },
    pitchingStats: {
      matchmakingProgress: 0,
      pitchCallsScheduled: 0,
      pitchCallsCompleted: 0,
      evaluationsProgress: 0,
      finalSelectionComplete: false,
      finalResultsComplete: false
    }
  });
  
  // Helper function to get deadline information for any round
  const getDeadlineInfo = (roundName: 'screening' | 'pitching', simplified: boolean = false): string => {
    if (!cohortSettings) return 'Loading deadline...';
    
    const deadline = roundName === 'screening' 
      ? cohortSettings.screening_deadline 
      : cohortSettings.pitching_deadline;
    
    if (!deadline) return 'No deadline set';
    
    const deadlineDate = new Date(deadline);
    return simplified ? formatDeadlineSimple(deadlineDate) : formatDeadlineDisplay(deadlineDate);
  };

  useEffect(() => {
  const fetchDashboardData = async () => {
      try {
        // Fetch consistent counts using utilities
        const counts = await getDashboardCounts();
        
        // Get current active round to determine which tables to query
        const { data: activeRound } = await supabase
          .from('rounds')
          .select('name')
          .eq('status', 'active')
          .maybeSingle();
        
        const isScreeningRound = !activeRound || activeRound.name === 'screening';
        
        const [
          { count: evaluationsCount },
          { count: assignmentsCount }
        ] = await Promise.all([
          isScreeningRound 
            ? supabase.from('screening_evaluations').select('*', { count: 'exact', head: true })
            : supabase.from('pitching_evaluations').select('*', { count: 'exact', head: true }),
          isScreeningRound
            ? supabase.from('screening_assignments').select('*', { count: 'exact', head: true })
            : supabase.from('pitching_assignments').select('*', { count: 'exact', head: true })
        ]);

        const { activeStartups, activeJurors, totalStartups, totalJurors } = counts;
        const totalEvaluations = evaluationsCount || 0;
        const totalAssignments = assignmentsCount || 0;
        
        let evaluationProgress = 0;
        let screeningProgress = { assignments: 0, completed: 0, percentage: 0 };
        let pitchingProgress = { assignments: 0, completed: 0, percentage: 0 };
        
        // For jurors, calculate progress for BOTH rounds
        if (profile?.role === 'vc') {
          // Get juror record first
          const { data: jurorRecord } = await supabase
            .from('jurors')
            .select('id')
            .eq('user_id', profile?.user_id)
            .maybeSingle();
            
          if (jurorRecord) {
            // Get assignments to extract startup IDs
            const [
              { data: screeningAssignmentData },
              { data: pitchingAssignmentData }
            ] = await Promise.all([
              supabase.from('screening_assignments')
                .select('startup_id')
                .eq('juror_id', jurorRecord.id)
                .eq('status', 'assigned'),
              supabase.from('pitching_assignments')
                .select('startup_id')
                .eq('juror_id', jurorRecord.id)
                .eq('status', 'assigned')
            ]);

            const screeningStartupIds = screeningAssignmentData?.map(a => a.startup_id) || [];
            const pitchingStartupIds = pitchingAssignmentData?.map(a => a.startup_id) || [];
            
            // Get evaluations filtered by assigned startups
            const [
              { count: screeningEvaluationsCount },
              { count: pitchingEvaluationsCount }
            ] = await Promise.all([
              screeningStartupIds.length > 0
                ? supabase.from('screening_evaluations')
                    .select('*', { count: 'exact', head: true })
                    .eq('evaluator_id', profile?.user_id)
                    .eq('status', 'submitted')
                    .in('startup_id', screeningStartupIds)
                : Promise.resolve({ count: 0 }),
              pitchingStartupIds.length > 0
                ? supabase.from('pitching_evaluations')
                    .select('*', { count: 'exact', head: true })
                    .eq('evaluator_id', profile?.user_id)
                    .eq('status', 'submitted')
                    .in('startup_id', pitchingStartupIds)
                : Promise.resolve({ count: 0 })
            ]);
              
            // Calculate progress for both rounds
            const screeningAssignmentsCount = screeningStartupIds.length;
            const screeningEvaluations = screeningEvaluationsCount || 0;
            const pitchingAssignmentsCount = pitchingStartupIds.length;
            const pitchingEvaluations = pitchingEvaluationsCount || 0;
            
            screeningProgress = {
              assignments: screeningAssignmentsCount,
              completed: screeningEvaluations,
              percentage: screeningAssignmentsCount > 0 ? Math.round((screeningEvaluations / screeningAssignmentsCount) * 100) : 0
            };
            
            pitchingProgress = {
              assignments: pitchingAssignmentsCount,
              completed: pitchingEvaluations,
              percentage: pitchingAssignmentsCount > 0 ? Math.round((pitchingEvaluations / pitchingAssignmentsCount) * 100) : 0
            };
            
            // Set overall progress based on current/active round
            evaluationProgress = isScreeningRound ? screeningProgress.percentage : pitchingProgress.percentage;
          }
        } else {
          // For admins, calculate progress for both rounds (same as VCs)
          // Get assignments to extract startup IDs
          const [
            { data: screeningAssignmentData },
            { data: pitchingAssignmentData }
          ] = await Promise.all([
            supabase.from('screening_assignments')
              .select('startup_id')
              .eq('status', 'assigned'),
            supabase.from('pitching_assignments')
              .select('startup_id')
              .eq('status', 'assigned')
          ]);

          const screeningStartupIds = screeningAssignmentData?.map(a => a.startup_id) || [];
          const pitchingStartupIds = pitchingAssignmentData?.map(a => a.startup_id) || [];
          
          // Get evaluations filtered by assigned startups
          const [
            { count: screeningEvaluationsCount },
            { count: pitchingEvaluationsCount }
          ] = await Promise.all([
            screeningStartupIds.length > 0
              ? supabase.from('screening_evaluations')
                  .select('*', { count: 'exact', head: true })
                  .eq('status', 'submitted')
                  .in('startup_id', screeningStartupIds)
              : Promise.resolve({ count: 0 }),
            pitchingStartupIds.length > 0
              ? supabase.from('pitching_evaluations')
                  .select('*', { count: 'exact', head: true })
                  .eq('status', 'submitted')
                  .in('startup_id', pitchingStartupIds)
              : Promise.resolve({ count: 0 })
          ]);
            
          // Calculate progress for both rounds
          const screeningAssignmentsCount = screeningStartupIds.length;
          const screeningEvaluations = screeningEvaluationsCount || 0;
          const pitchingAssignmentsCount = pitchingStartupIds.length;
          const pitchingEvaluations = pitchingEvaluationsCount || 0;
          
          screeningProgress = {
            assignments: screeningAssignmentsCount,
            completed: screeningEvaluations,
            percentage: screeningAssignmentsCount > 0 ? Math.round((screeningEvaluations / screeningAssignmentsCount) * 100) : 0
          };
          
          pitchingProgress = {
            assignments: pitchingAssignmentsCount,
            completed: pitchingEvaluations,
            percentage: pitchingAssignmentsCount > 0 ? Math.round((pitchingEvaluations / pitchingAssignmentsCount) * 100) : 0
          };
          
          // Set overall progress based on current/active round (same as VCs)
          evaluationProgress = isScreeningRound ? screeningProgress.percentage : pitchingProgress.percentage;
        }
        
        const matchmakingProgress = activeStartups > 0 ? Math.round((totalAssignments / (activeStartups * 3)) * 100) : 0;
        
        // Calculate pitching calls statistics from pitching_assignments
        const { data: pitchingAssignments } = await supabase
          .from('pitching_assignments')
          .select('status, meeting_scheduled_date, meeting_completed_date');
        
        const pitchCallsScheduled = pitchingAssignments?.filter(assignment => 
          assignment.status === 'scheduled' || assignment.meeting_scheduled_date
        ).length || 0;
        
        const pitchCallsCompleted = pitchingAssignments?.filter(assignment => 
          assignment.status === 'completed' || assignment.meeting_completed_date
        ).length || 0;

        setDashboardData({
          activeStartups,
          activeJurors,
          totalStartups,
          totalJurors,
          activeRound: (activeRound?.name === 'pitching' ? 'pitching' : 'screening') as 'screening' | 'pitching',
          evaluationProgress,
          deadlineInfo: getDeadlineInfo(activeRound?.name as 'screening' | 'pitching' || 'screening', true),
          nextMilestone: profile?.role === 'vc' ? 'Complete your startup evaluations' : 'Complete juror matchmaking assignments',
          screeningProgress,
          pitchingProgress,
          screeningStats: {
            startupsUploaded: activeStartups,
            jurorsUploaded: activeJurors,
            matchmakingProgress,
            evaluationsProgress: screeningProgress.percentage || evaluationProgress,
            selectionComplete: false, // TODO: Calculate from actual data
            resultsComplete: false // TODO: Calculate from actual data
          },
          pitchingStats: {
            matchmakingProgress: 0, // TODO: Calculate for pitching phase
            pitchCallsScheduled,
            pitchCallsCompleted,
            evaluationsProgress: pitchingProgress.percentage,
            finalSelectionComplete: false,
            finalResultsComplete: false
          }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    
    if (profile?.user_id) {
      fetchDashboardData();
    }
  }, [profile]);  

  // Fetch AI guidance for admins
  const { 
    data: guidanceData, 
    loading: guidanceLoading, 
    error: guidanceError,
    refetch: refetchGuidance 
  } = useAIGuidanceData(dashboardData.activeRound);

  // Refresh profile when user returns to dashboard (e.g., after profile completion)
  useEffect(() => {
    const handleFocus = () => {
      if (profile?.role === 'vc') {
        refreshProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [profile?.role, refreshProfile]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Guidance Box for Admins */}
        {profile?.role === 'admin' && (
          <AIGuidanceBox
            guidance={guidanceData?.guidance || null}
            priority={guidanceData?.priority || 'medium'}
            quickActions={guidanceData?.quickActions || []}
            insights={guidanceData?.insights || []}
            loading={guidanceLoading}
            error={guidanceError}
            onRefresh={refetchGuidance}
          />
        )}

        {/* AI Guidance Box for VCs */}
        {profile?.role === 'vc' && (
          <AIGuidanceBox
            guidance={guidanceData?.guidance || null}
            priority={guidanceData?.priority || 'medium'}
            quickActions={guidanceData?.quickActions || []}
            insights={guidanceData?.insights || []}
            loading={guidanceLoading}
            error={guidanceError}
            onRefresh={refetchGuidance}
          />
        )}

        {/* Profile Completion Banner for VCs */}
        {profile?.role === 'vc' && (!profile.target_verticals || profile.target_verticals.length === 0 || !profile.preferred_stages || profile.preferred_stages.length === 0) && (
          <div className="mb-6">
            <Card className="border-warning/20 bg-warning/10 shadow-soft hover:shadow-brand transition-smooth">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground flex items-center gap-2 font-headline">
                  <Users className="w-5 h-5" />
                  Complete Your Profile
                </CardTitle>
                <CardDescription className="font-body">
                  Finish setting up your profile to start evaluating startups and scheduling pitch sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/juror-onboarding?onboarding=true')}>
                  Complete Profile Setup
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Unified Overview Card */}
        <div className="mb-8">
          <UnifiedOverviewCard
            totalStartups={dashboardData.totalStartups}
            activeJurors={dashboardData.activeJurors}
            totalJurors={dashboardData.totalJurors}
            activeRound={dashboardData.activeRound}
            evaluationProgress={dashboardData.evaluationProgress}
            completedEvaluations={dashboardData.activeRound === 'screening' ? dashboardData.screeningProgress.completed : dashboardData.pitchingProgress.completed}
            totalEvaluations={dashboardData.activeRound === 'screening' ? dashboardData.screeningProgress.assignments : dashboardData.pitchingProgress.assignments}
            cohortName={cohortSettings?.cohort_name}
            deadlineInfo={dashboardData.deadlineInfo}
            nextMilestone={dashboardData.nextMilestone}
            userRole={profile?.role}
          />
        </div>

        {/* Community Manager Funnel Workflow */}
        {profile?.role === 'admin' && (
          <div className="space-y-8">
            {/* Round 1 - Screening */}
            <ScreeningFunnelView 
              isActive={dashboardData.activeRound === 'screening'}
              deadlineInfo={getDeadlineInfo('screening')}
            />

            {/* Round 2 - Pitching */}
            <PitchingFunnelView 
              isActive={dashboardData.activeRound === 'pitching'} 
              deadlineInfo={getDeadlineInfo('pitching')}
            />
          </div>
        )}

        {/* VC Funnel Workflow */}
        {profile?.role === 'vc' && (
          <div className="space-y-8">
            {/* Role-specific tagline */}
            <div className="text-center py-4">
              <p className="text-lg text-muted-foreground">
                You are 1 of {dashboardData.totalJurors} jurors helping evaluate this year's cohort of {dashboardData.totalStartups} startups.
              </p>
            </div>

            {/* Round 1 - Screening */}
            <Card>
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary" className="px-3 py-1">Round 1</Badge>
                        Screening Round
                      </CardTitle>
                      <CardDescription>
                        Evaluate your assigned startups for initial screening
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{getDeadlineInfo('screening')}</span>
                      </div>
                      <Badge 
                        variant={dashboardData.activeRound === 'screening' ? 'default' : 'outline'}
                        className="px-3 py-1"
                      >
                        {dashboardData.activeRound === 'screening' ? 'Active' : 'Completed'}
                      </Badge>
                    </div>
                  </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <FunnelStage
                    title="Profile Setup"
                    description="Complete your juror profile with expertise and preferences"
                    tooltip="Complete your profile to receive startup assignments."
                    status={
                      profile?.target_verticals && profile.target_verticals.length > 0 && 
                      profile?.preferred_stages && profile.preferred_stages.length > 0
                        ? 'completed' : 'current'
                    }
                    statusText={
                      profile?.target_verticals && profile.target_verticals.length > 0 && 
                      profile?.preferred_stages && profile.preferred_stages.length > 0
                        ? 'Profile complete' : 'Profile setup required'
                    }
                    icon={Building2}
                    onClick={() => navigate('/juror-onboarding?onboarding=true')}
                    role="vc"
                  />
                  <FunnelStage
                    title="Assigned Startups (Screening)"
                    description="Score and provide feedback for your assigned startups"
                    tooltip="Complete evaluations for all assigned startups."
                    status={
                      dashboardData.screeningProgress.percentage === 100 
                        ? 'completed' 
                        : dashboardData.screeningProgress.percentage > 0 ? 'current' : 'upcoming'
                    }
                    progress={dashboardData.screeningProgress.percentage}
                    statusText={`${dashboardData.screeningProgress.completed} of ${dashboardData.screeningProgress.assignments} startups evaluated (${dashboardData.screeningProgress.percentage}%)`}
                    icon={Star}
                    onClick={() => navigate('/evaluate?round=screening')}
                    role="vc"
                  />
                  <FunnelStage
                    title="Results & Next Steps"
                    description="View evaluation results and prepare for pitch sessions"
                    tooltip="Review results from the screening round."
                    status={dashboardData.screeningProgress.percentage === 100 ? 'current' : 'upcoming'}
                    statusText="Pending evaluation completion"
                    icon={TrendingUp}
                    onClick={() => navigate('/selection?round=screening')}
                    role="vc"
                    isLast
                  />
                </div>
              </CardContent>
            </Card>

            {/* Round 2 - Pitching */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="default" className="px-3 py-1">Round 2</Badge>
                      Pitching Round
                    </CardTitle>
                    <CardDescription>
                      Participate in pitch sessions and provide final evaluations
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{getDeadlineInfo('pitching')}</span>
                    </div>
                    <Badge 
                      variant={dashboardData.activeRound === 'pitching' ? 'default' : 'outline'}
                      className="px-3 py-1"
                    >
                      {dashboardData.activeRound === 'pitching' ? 'Active' : 'Upcoming'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <FunnelStage
                     title="Set Up Scheduling"
                     description="Provide your scheduling link for pitch session scheduling"
                     tooltip="Update your profile with scheduling link for pitch meetings."
                     status={profile?.calendly_link ? 'completed' : 'upcoming'}
                     statusText={profile?.calendly_link ? 'Scheduling link added' : 'Scheduling link needed'}
                    icon={Calendar}
                    onClick={() => navigate('/profile')}
                    role="vc"
                  />
                  <FunnelStage
                    title="Assigned Startups (Pitching)"
                    description="Attend scheduled pitch meetings with selected startups"
                    tooltip="Participate in pitch sessions with assigned startups."
                    status={
                      dashboardData.pitchingProgress.assignments > 0 
                        ? dashboardData.pitchingProgress.percentage === 100 ? 'completed' : 'current'
                        : 'upcoming'
                    }
                    progress={dashboardData.pitchingProgress.percentage}
                    statusText={`${dashboardData.pitchingProgress.completed} of ${dashboardData.pitchingProgress.assignments} startups evaluated (${dashboardData.pitchingProgress.percentage}%)`}
                    icon={Phone}
                    onClick={() => navigate('/evaluate?round=pitching')}
                    role="vc"
                  />
                  <FunnelStage
                    title="Pitch Evaluations"
                    description="Submit evaluations after each pitch session"
                    tooltip="Complete evaluations for all pitch sessions."
                    status={dashboardData.pitchingProgress.percentage === 100 ? 'completed' : 'upcoming'}
                    statusText={dashboardData.pitchingProgress.percentage === 100 ? 'All evaluations complete' : 'Pending pitch completion'}
                    icon={FileText}
                    onClick={() => navigate('/evaluate?round=pitching')}
                    role="vc"
                    isLast
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;