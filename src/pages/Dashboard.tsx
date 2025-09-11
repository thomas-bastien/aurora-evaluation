import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDashboardCounts } from '@/utils/countsUtils';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CohortSummaryCard } from "@/components/dashboard/CohortSummaryCard";
import { FunnelStage } from "@/components/dashboard/FunnelStage";
import { ScreeningFunnelView } from "@/components/dashboard/ScreeningFunnelView";
import { PitchingFunnelView } from "@/components/dashboard/PitchingFunnelView";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCohortSettings } from "@/hooks/useCohortSettings";
import { formatDeadlineDisplay, isDeadlinePassed } from "@/utils/deadlineUtils";
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

  useEffect(() => {
  // Helper function to get deadline information for any round
  const getDeadlineInfo = (roundName: 'screening' | 'pitching'): string => {
    if (!cohortSettings) return 'Loading deadline...';
    
    const deadline = roundName === 'screening' 
      ? cohortSettings.screening_deadline 
      : cohortSettings.pitching_deadline;
    
    if (!deadline) return 'No deadline set';
    
    const deadlineDate = new Date(deadline);
    return formatDeadlineDisplay(deadlineDate);
  };

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
            // Get assignments and evaluations for BOTH rounds in parallel
            const [
              { count: screeningAssignmentsCount },
              { count: pitchingAssignmentsCount },
              { count: screeningEvaluationsCount },
              { count: pitchingEvaluationsCount }
            ] = await Promise.all([
              supabase.from('screening_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('juror_id', jurorRecord.id)
                .eq('status', 'assigned'),
              supabase.from('pitching_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('juror_id', jurorRecord.id)
                .eq('status', 'assigned'),
              supabase.from('screening_evaluations')
                .select('*', { count: 'exact', head: true })
                .eq('evaluator_id', profile?.user_id)
                .eq('status', 'submitted'),
              supabase.from('pitching_evaluations')
                .select('*', { count: 'exact', head: true })
                .eq('evaluator_id', profile?.user_id)
                .eq('status', 'submitted')
            ]);
              
            // Calculate progress for both rounds
            const screeningAssignments = screeningAssignmentsCount || 0;
            const screeningEvaluations = screeningEvaluationsCount || 0;
            const pitchingAssignments = pitchingAssignmentsCount || 0;
            const pitchingEvaluations = pitchingEvaluationsCount || 0;
            
            screeningProgress = {
              assignments: screeningAssignments,
              completed: screeningEvaluations,
              percentage: screeningAssignments > 0 ? Math.round((screeningEvaluations / screeningAssignments) * 100) : 0
            };
            
            pitchingProgress = {
              assignments: pitchingAssignments,
              completed: pitchingEvaluations,
              percentage: pitchingAssignments > 0 ? Math.round((pitchingEvaluations / pitchingAssignments) * 100) : 0
            };
            
            // Set overall progress based on current/active round
            evaluationProgress = isScreeningRound ? screeningProgress.percentage : pitchingProgress.percentage;
          }
        } else {
          // For admins, calculate overall progress
          const expectedEvaluations = activeStartups * 3; // 3 jurors per startup in screening
          evaluationProgress = expectedEvaluations > 0 ? Math.round((totalEvaluations / expectedEvaluations) * 100) : 0;
        }
        
        const matchmakingProgress = activeStartups > 0 ? Math.round((totalAssignments / (activeStartups * 3)) * 100) : 0;

        setDashboardData({
          activeStartups,
          activeJurors,
          totalStartups,
          totalJurors,
          activeRound: (activeRound?.name === 'pitching' ? 'pitching' : 'screening') as 'screening' | 'pitching',
          evaluationProgress,
          deadlineInfo: getDeadlineInfo(activeRound?.name as 'screening' | 'pitching' || 'screening'),
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
            pitchCallsScheduled: 0, // TODO: Calculate from pitch_requests
            pitchCallsCompleted: 0, // TODO: Calculate from pitch_requests
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
        {/* Profile Completion Banner for VCs */}
        {profile?.role === 'vc' && (!profile.expertise || profile.expertise.length === 0 || !profile.investment_stages || profile.investment_stages.length === 0) && (
          <div className="mb-6 animate-pulse-gentle">
            <Card className="bg-gradient-warning border-warning/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Complete Your Profile
                </CardTitle>
                <CardDescription className="text-black">
                  Finish setting up your profile to start evaluating startups and scheduling pitch sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/juror-onboarding?onboarding=true')} className="bg-warning text-warning-foreground hover:bg-warning/90">
                  Complete Profile Setup
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cohort Summary Card */}
        <div className="mb-8 animate-fade-in">
          <CohortSummaryCard
            totalStartups={dashboardData.totalStartups}
            activeJurors={dashboardData.activeJurors}
            activeRound={dashboardData.activeRound}
            evaluationProgress={dashboardData.evaluationProgress}
            cohortName={cohortSettings?.cohort_name}
            deadlineInfo={dashboardData.deadlineInfo}
            nextMilestone={dashboardData.nextMilestone}
          />
        </div>

        {/* Community Manager Funnel Workflow */}
        {profile?.role === 'admin' && (
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: "400ms" }}>
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
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: "400ms" }}>
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
                      profile?.expertise && profile.expertise.length > 0 && 
                      profile?.investment_stages && profile.investment_stages.length > 0
                        ? 'completed' : 'current'
                    }
                    statusText={
                      profile?.expertise && profile.expertise.length > 0 && 
                      profile?.investment_stages && profile.investment_stages.length > 0
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
                    title="Set Up Calendly"
                    description="Provide your Calendly link for pitch session scheduling"
                    tooltip="Update your profile with Calendly link for pitch meetings."
                    status={profile?.calendly_link ? 'completed' : 'upcoming'}
                    statusText={profile?.calendly_link ? 'Calendly link added' : 'Calendly link needed'}
                    icon={Calendar}
                    onClick={() => navigate('/juror-profile')}
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