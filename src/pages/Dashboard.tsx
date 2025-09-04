import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CohortSummaryCard } from "@/components/dashboard/CohortSummaryCard";
import { FunnelStage } from "@/components/dashboard/FunnelStage";
import { useUserProfile } from "@/hooks/useUserProfile";
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
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalStartups: 0,
    totalJurors: 0,
    activePhase: 'screening' as 'screening' | 'pitching',
    evaluationProgress: 0,
    reminders: 0,
    nextMilestone: 'Loading...',
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
    const fetchDashboardData = async () => {
      try {
        // Fetch basic counts
        const [
          { count: startupsCount },
          { count: jurorsCount },
          { count: evaluationsCount },
          { count: assignmentsCount }
        ] = await Promise.all([
          supabase.from('startups').select('*', { count: 'exact', head: true }),
          supabase.from('jurors').select('*', { count: 'exact', head: true }),
          supabase.from('evaluations').select('*', { count: 'exact', head: true }),
          supabase.from('startup_assignments').select('*', { count: 'exact', head: true })
        ]);

        const totalStartups = startupsCount || 0;
        const totalJurors = jurorsCount || 0;
        const totalEvaluations = evaluationsCount || 0;
        const totalAssignments = assignmentsCount || 0;
        
        // Calculate progress metrics
        const expectedEvaluations = totalStartups * 3; // 3 jurors per startup in screening
        const evaluationProgress = expectedEvaluations > 0 ? Math.round((totalEvaluations / expectedEvaluations) * 100) : 0;
        const matchmakingProgress = totalStartups > 0 ? Math.round((totalAssignments / (totalStartups * 3)) * 100) : 0;

        setDashboardData({
          totalStartups,
          totalJurors,
          activePhase: 'screening', // TODO: Make this dynamic based on actual phase
          evaluationProgress,
          reminders: 12, // TODO: Calculate actual reminders sent
          nextMilestone: 'Complete juror matchmaking assignments',
          screeningStats: {
            startupsUploaded: totalStartups,
            jurorsUploaded: totalJurors,
            matchmakingProgress,
            evaluationsProgress: evaluationProgress,
            selectionComplete: false, // TODO: Calculate from actual data
            resultsComplete: false // TODO: Calculate from actual data
          },
          pitchingStats: {
            matchmakingProgress: 0, // TODO: Calculate for pitching phase
            pitchCallsScheduled: 0, // TODO: Calculate from pitch_requests
            pitchCallsCompleted: 0, // TODO: Calculate from pitch_requests
            evaluationsProgress: 0, // TODO: Calculate for pitching evaluations
            finalSelectionComplete: false,
            finalResultsComplete: false
          }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    fetchDashboardData();
  }, []);

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
            totalJurors={dashboardData.totalJurors}
            activePhase={dashboardData.activePhase}
            evaluationProgress={dashboardData.evaluationProgress}
            reminders={dashboardData.reminders}
            nextMilestone={dashboardData.nextMilestone}
          />
        </div>

        {/* Role Context */}
        <div className="mb-8 text-center animate-fade-in" style={{ animationDelay: "200ms" }}>
          <p className="text-lg text-muted-foreground">
            {profile?.role === 'admin' 
              ? `You are managing this cohort's journey from Screening to Finalists.`
              : `You are 1 of ${dashboardData.totalJurors} jurors helping evaluate this year's cohort of ${dashboardData.totalStartups} startups.`
            }
          </p>
        </div>

        {/* Shared Dashboard Structure for Both Roles */}
        <div className="space-y-8 animate-fade-in" style={{ animationDelay: "400ms" }}>
          
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
                    {profile?.role === 'admin' 
                      ? 'Initial evaluation and selection of semi-finalists'
                      : 'Evaluate assigned startups for semi-finalist selection'
                    }
                  </CardDescription>
                </div>
                <Badge 
                  variant={dashboardData.activePhase === 'screening' ? 'default' : 'outline'}
                  className="px-3 py-1"
                >
                  {dashboardData.activePhase === 'screening' ? 'Active' : dashboardData.activePhase === 'pitching' ? 'Completed' : 'Upcoming'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${profile?.role === 'admin' ? 'flex flex-col space-y-4' : 'grid gap-4 md:grid-cols-2'}`}>
                {profile?.role === 'admin' ? (
                  <>
                    <FunnelStage
                      title="Upload Startups & Jury"
                      description="Upload and review all applicants and jurors for this cohort"
                      tooltip="Upload and review all applicants and jurors for this cohort."
                      status={
                        dashboardData.screeningStats.startupsUploaded > 0 && dashboardData.screeningStats.jurorsUploaded > 0 
                          ? 'completed' 
                          : dashboardData.activePhase === 'screening' ? 'current' : 'upcoming'
                      }
                      statusText={`${dashboardData.screeningStats.startupsUploaded} startups, ${dashboardData.screeningStats.jurorsUploaded} jurors uploaded`}
                      icon={Upload}
                      onClick={() => navigate('/startups')}
                    />
                    <FunnelStage
                      title="Matchmaking (Screening)"
                      description="Assign 3 jurors to each startup"
                      tooltip="Assign 3 jurors to each startup."
                      status={
                        dashboardData.screeningStats.matchmakingProgress === 100 
                          ? 'completed' 
                          : dashboardData.screeningStats.matchmakingProgress > 0 ? 'current' : 'upcoming'
                      }
                      progress={dashboardData.screeningStats.matchmakingProgress}
                      statusText={`${Math.round((dashboardData.screeningStats.matchmakingProgress / 100) * dashboardData.totalStartups)}/${dashboardData.totalStartups} startups covered`}
                      icon={Network}
                      onClick={() => navigate('/selection/matchmaking?phase=screening')}
                    />
                    <FunnelStage
                      title="Evaluations (Screening)"
                      description="Jurors score their assigned startups"
                      tooltip="Jurors score their assigned startups."
                      status={
                        dashboardData.screeningStats.evaluationsProgress === 100 
                          ? 'completed' 
                          : dashboardData.screeningStats.evaluationsProgress > 0 ? 'current' : 'upcoming'
                      }
                      progress={dashboardData.screeningStats.evaluationsProgress}
                      statusText={`${dashboardData.screeningStats.evaluationsProgress}% completed`}
                      icon={Star}
                      onClick={() => navigate('/selection?phase=screening')}
                    />
                    <FunnelStage
                      title="Selection – Semi-finalists"
                      description="Confirm the 30 semi-finalists that progress to Pitching"
                      tooltip="Confirm the 30 semi-finalists that progress to Pitching."
                      status={
                        dashboardData.screeningStats.selectionComplete 
                          ? 'completed' 
                          : dashboardData.screeningStats.evaluationsProgress === 100 ? 'current' : 'upcoming'
                      }
                      statusText={dashboardData.screeningStats.selectionComplete ? 'Complete' : 'Pending'}
                      icon={CheckCircle}
                      onClick={() => navigate('/selection?phase=screening')}
                    />
                    <FunnelStage
                      title="Results Communication"
                      description="Send outcome emails and feedback to all startups"
                      tooltip="Send outcome emails and feedback to all startups."
                      status={
                        dashboardData.screeningStats.resultsComplete 
                          ? 'completed' 
                          : dashboardData.screeningStats.selectionComplete ? 'current' : 'upcoming'
                      }
                      statusText={dashboardData.screeningStats.resultsComplete ? 'Complete' : 'Pending'}
                      icon={MessageSquare}
                      onClick={() => navigate('/selection?phase=screening')}
                      isLast
                    />
                  </>
                ) : (
                  <>
                    <FunnelStage
                      title="Assigned Startups (Screening)"
                      description="Your startups for Screening"
                      tooltip="Startups allocated to you for the Screening round. You can draft and edit your evaluations until the phase closes."
                      status={dashboardData.screeningStats.startupsUploaded > 0 ? 'current' : 'upcoming'}
                      statusText={`${Math.round(dashboardData.totalStartups / 10)} assigned`}
                      icon={Users}
                      onClick={() => navigate('/evaluate')}
                    />
                    <FunnelStage
                      title="Evaluate (Screening)"
                      description="Complete evaluation forms"
                      tooltip="Provide scores and detailed feedback (min. 30 characters per open field). Required for all assigned startups."
                      status={dashboardData.screeningStats.evaluationsProgress > 0 ? 'current' : 'upcoming'}
                      progress={dashboardData.screeningStats.evaluationsProgress}
                      statusText={`${dashboardData.screeningStats.evaluationsProgress}% completed`}
                      icon={FileText}
                      onClick={() => navigate('/evaluate')}
                      isLast
                    />
                  </>
                )}
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
                    {profile?.role === 'admin' 
                      ? 'Final pitch presentations and selection of finalists'
                      : 'Pitch calls and final evaluations for finalist selection'
                    }
                  </CardDescription>
                </div>
                <Badge 
                  variant={dashboardData.activePhase === 'pitching' ? 'default' : 'outline'}
                  className="px-3 py-1"
                >
                  {dashboardData.activePhase === 'pitching' ? 'Active' : 'Upcoming'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${profile?.role === 'admin' ? 'flex flex-col space-y-4' : 'grid gap-4 md:grid-cols-2 lg:grid-cols-4'}`}>
                {profile?.role === 'admin' ? (
                  <>
                    <FunnelStage
                      title="Matchmaking (Semi-finalists)"
                      description="Assign jurors to the 30 semi-finalists for live pitch calls"
                      tooltip="Assign jurors to the 30 semi-finalists for live pitch calls."
                      status={
                        dashboardData.pitchingStats.matchmakingProgress === 100 
                          ? 'completed' 
                          : dashboardData.activePhase === 'pitching' ? 'current' : 'upcoming'
                      }
                      progress={dashboardData.pitchingStats.matchmakingProgress}
                      statusText={`${Math.round((dashboardData.pitchingStats.matchmakingProgress / 100) * 30)}/30 covered`}
                      icon={Network}
                      onClick={() => navigate('/selection/matchmaking?phase=pitching')}
                    />
                    <FunnelStage
                      title="Pitch Calls"
                      description="Jurors and startups meet via Calendly links"
                      tooltip="Jurors and startups meet via Calendly links."
                      status={
                        dashboardData.pitchingStats.pitchCallsCompleted > 0 
                          ? 'current' 
                          : dashboardData.pitchingStats.pitchCallsScheduled > 0 ? 'current' : 'upcoming'
                      }
                      statusText={`${dashboardData.pitchingStats.pitchCallsScheduled} scheduled / ${dashboardData.pitchingStats.pitchCallsCompleted} completed`}
                      icon={Phone}
                      onClick={() => navigate('/selection?phase=pitching')}
                    />
                    <FunnelStage
                      title="Evaluations (Pitching)"
                      description="Jurors submit post-pitch evaluations"
                      tooltip="Jurors submit post-pitch evaluations."
                      status={
                        dashboardData.pitchingStats.evaluationsProgress === 100 
                          ? 'completed' 
                          : dashboardData.pitchingStats.evaluationsProgress > 0 ? 'current' : 'upcoming'
                      }
                      progress={dashboardData.pitchingStats.evaluationsProgress}
                      statusText={`${dashboardData.pitchingStats.evaluationsProgress}% submitted`}
                      icon={Star}
                      onClick={() => navigate('/selection?phase=pitching')}
                    />
                    <FunnelStage
                      title="Selection – Finalists"
                      description="Confirm the 10 finalists"
                      tooltip="Confirm the 10 finalists."
                      status={
                        dashboardData.pitchingStats.finalSelectionComplete 
                          ? 'completed' 
                          : dashboardData.pitchingStats.evaluationsProgress === 100 ? 'current' : 'upcoming'
                      }
                      statusText={dashboardData.pitchingStats.finalSelectionComplete ? 'Complete' : 'Pending'}
                      icon={TrendingUp}
                      onClick={() => navigate('/selection?phase=pitching')}
                    />
                    <FunnelStage
                      title="Results Communication & Final Report"
                      description="Notify all startups, generate final reports"
                      tooltip="Notify all startups, generate final juror & programme reports."
                      status={
                        dashboardData.pitchingStats.finalResultsComplete 
                          ? 'completed' 
                          : dashboardData.pitchingStats.finalSelectionComplete ? 'current' : 'upcoming'
                      }
                      statusText={dashboardData.pitchingStats.finalResultsComplete ? 'Complete' : 'Pending'}
                      icon={FileText}
                      onClick={() => navigate('/selection?phase=pitching')}
                      isLast
                    />
                  </>
                ) : (
                  <>
                    <FunnelStage
                      title="Assigned Startups (Pitching)"
                      description="Your finalists for Pitching"
                      tooltip="Your Pitching startups, selected from the 30 semi-finalists."
                      status={dashboardData.activePhase === 'pitching' ? 'current' : 'upcoming'}
                      statusText={`${dashboardData.activePhase === 'pitching' ? '2-3' : '0'} assigned`}
                      icon={Users}
                      onClick={() => navigate('/evaluate?phase=pitching')}
                    />
                    <FunnelStage
                      title="Upload Scheduling Link"
                      description="Add your Calendly link"
                      tooltip="Add your Calendly (or other scheduling) link so startups can book slots with you. You only need to do this once per cohort."
                      status={profile?.calendly_link ? 'completed' : 'current'}
                      statusText={profile?.calendly_link ? 'Link on file' : 'Missing'}
                      icon={Calendar}
                      onClick={() => navigate('/profile')}
                    />
                    <FunnelStage
                      title="Pitch Calls"
                      description="Join scheduled calls"
                      tooltip="Startups choose slots from your scheduling link. You just need to join the calls when booked. Status updates will track scheduled and completed calls."
                      status={dashboardData.pitchingStats.pitchCallsScheduled > 0 ? 'current' : 'upcoming'}
                      statusText={`${dashboardData.pitchingStats.pitchCallsCompleted}/${dashboardData.pitchingStats.pitchCallsScheduled} completed`}
                      icon={Phone}
                      onClick={() => navigate('/evaluate?phase=pitching&view=calls')}
                    />
                    <FunnelStage
                      title="Evaluate (Pitching)"
                      description="Post-pitch evaluations"
                      tooltip="Submit your evaluation after each pitch call. Editable until the CM closes the phase."
                      status={dashboardData.pitchingStats.evaluationsProgress > 0 ? 'current' : 'upcoming'}
                      progress={dashboardData.pitchingStats.evaluationsProgress}
                      statusText={`${dashboardData.pitchingStats.evaluationsProgress}% submitted`}
                      icon={MessageSquare}
                      onClick={() => navigate('/evaluate?phase=pitching&view=evaluations')}
                      isLast
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;